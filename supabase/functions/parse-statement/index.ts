// Supabase Edge Function: parse an uploaded bank statement into import_row
// records for review. Invoked with { statement_import_id }.
//
// Flow (spec §5):
//   1. Load the statement_import row + file from Storage (service role).
//   2. Extract text from the PDF (or pass CSV through).
//   3. Call the Anthropic API with a per-bank prompt selected by bank_format.
//   4. Insert parsed rows into import_row with status 'pending'.
//      Nothing is ever auto-committed — the client review screen does that.
//
// Secrets required (supabase secrets set):
//   ANTHROPIC_API_KEY
//
// Deploy: supabase functions deploy parse-statement

import { createClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'

const BANK_PROMPTS: Record<string, string> = {
  regions_pdf:
    'This is a Regions Bank checking statement. Extract every transaction line.',
  capitalone_pdf:
    'This is a Capital One 360 statement. Extract every transaction line.',
  firstmid_csv:
    'This is a FirstMid CSV export. Extract every transaction row.',
}

// Base64-encode bytes in chunks. Spreading a whole statement's bytes into
// String.fromCharCode(...bytes) overflows the call stack on real PDFs, so we
// build the binary string in fixed-size slices first.
function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

// Claude is told to return raw JSON, but strip an accidental ```json fence
// before parsing so one stray wrapper doesn't fail the whole import.
function stripFences(text: string): string {
  const t = text.trim()
  if (t.startsWith('```')) {
    return t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  return t
}

const SYSTEM_PROMPT = `You extract bank statement transactions into JSON.
Return ONLY a JSON array; each element:
{
  "source_name": string,        // merchant / payee, cleaned up
  "date": "YYYY-MM-DD",
  "amount_cents": integer,      // positive integer cents, outflows only
  "suggested_category": string | null  // one of: credit card, loan, utils, subs, groceries, shopping, dining, maintenance, fun
}
Skip deposits, interest, and running-balance lines. No prose, no markdown fences.`

// The client invokes this from the browser via supabase.functions.invoke,
// which sends a CORS preflight — echo the headers back or the call fails.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, init?: ResponseInit) =>
  Response.json(body, { ...init, headers: { ...CORS, ...init?.headers } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { statement_import_id } = await req.json()
    if (!statement_import_id) {
      return json({ error: 'statement_import_id required' }, { status: 400 })
    }

    // Service role: this function is the only privileged writer in the system.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: imp, error: impError } = await supabase
      .from('statement_import')
      .select('*')
      .eq('id', statement_import_id)
      .single()
    if (impError || !imp) {
      return json({ error: 'statement_import not found' }, { status: 404 })
    }

    const { data: file, error: fileError } = await supabase.storage
      .from('statements')
      .download(imp.file_path)
    if (fileError || !file) {
      return json({ error: 'statement file not found' }, { status: 404 })
    }

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })
    const bankPrompt = BANK_PROMPTS[imp.bank_format] ?? 'Extract every transaction line.'

    // PDFs go to the API as a document block (Claude reads PDFs natively);
    // CSV/OFX go as plain text.
    const isPdf = imp.file_path.toLowerCase().endsWith('.pdf')
    const bytes = new Uint8Array(await file.arrayBuffer())

    const content: Anthropic.ContentBlockParam[] = isPdf
      ? [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: toBase64(bytes),
            },
          },
          { type: 'text', text: bankPrompt },
        ]
      : [{ type: 'text', text: `${bankPrompt}\n\n${new TextDecoder().decode(bytes)}` }]

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    })

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
    const parsed: {
      source_name: string
      date: string
      amount_cents: number
      suggested_category: string | null
    }[] = JSON.parse(stripFences(text))

    // Map suggested category names to ids.
    const { data: categories } = await supabase.from('transaction_category').select('id, name')
    const categoryId = (name: string | null) =>
      categories?.find((c) => c.name === name)?.id ?? null

    const rows = parsed.map((p) => ({
      statement_import_id,
      raw_data: p,
      parsed_source_name: p.source_name,
      parsed_date: p.date,
      parsed_amount_cents: Math.round(p.amount_cents),
      suggested_category_id: categoryId(p.suggested_category),
      status: 'pending',
    }))

    const { error: insertError } = await supabase.from('import_row').insert(rows)
    if (insertError) {
      return json({ error: insertError.message }, { status: 500 })
    }

    return json({ inserted: rows.length })
  } catch (err) {
    return json({ error: String(err) }, { status: 500 })
  }
})
