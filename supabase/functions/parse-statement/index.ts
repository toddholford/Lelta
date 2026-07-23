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

const SYSTEM_PROMPT = `You extract bank statement transactions into JSON.
Return ONLY a JSON array; each element:
{
  "source_name": string,        // merchant / payee, cleaned up
  "date": "YYYY-MM-DD",
  "amount_cents": integer,      // positive integer cents, outflows only
  "suggested_category": string | null  // one of: credit card, loan, debts, utils, subs, groceries, shopping, dining, maintenance, fun
}
Skip deposits, interest, and running-balance lines. No prose, no markdown fences.`

Deno.serve(async (req) => {
  try {
    const { statement_import_id } = await req.json()
    if (!statement_import_id) {
      return Response.json({ error: 'statement_import_id required' }, { status: 400 })
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
      return Response.json({ error: 'statement_import not found' }, { status: 404 })
    }

    const { data: file, error: fileError } = await supabase.storage
      .from('statements')
      .download(imp.file_path)
    if (fileError || !file) {
      return Response.json({ error: 'statement file not found' }, { status: 404 })
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
              data: btoa(String.fromCharCode(...bytes)),
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
    }[] = JSON.parse(text)

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
      return Response.json({ error: insertError.message }, { status: 500 })
    }

    return Response.json({ inserted: rows.length })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
})
