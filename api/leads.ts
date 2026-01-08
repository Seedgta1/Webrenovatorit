import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  try {
    // GET: Recupera tutti i lead o uno specifico
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const id = url.searchParams.get('id');

      if (id) {
        // Fetch singolo per preview
        const { rows } = await sql`SELECT * FROM leads WHERE id = ${id}`;
        if (rows.length === 0) return new Response(JSON.stringify(null), { status: 404 });
        
        const row = rows[0];
        const lead = {
          id: row.id,
          name: row.name,
          address: row.address,
          type: row.type,
          website: row.website,
          phoneNumber: row.phone_number,
          status: row.status,
          leadStatus: row.lead_status,
          reasoning: row.reasoning,
          creations: row.creations ? JSON.parse(row.creations) : []
        };
        return new Response(JSON.stringify(lead), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      // Fetch tutti
      const { rows } = await sql`SELECT * FROM leads ORDER BY created_at DESC`;
      const leads = rows.map(row => ({
        id: row.id,
        name: row.name,
        address: row.address,
        type: row.type,
        website: row.website,
        phoneNumber: row.phone_number,
        status: row.status,
        leadStatus: row.lead_status,
        reasoning: row.reasoning,
        creations: row.creations ? JSON.parse(row.creations) : []
      }));

      return new Response(JSON.stringify(leads), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // POST: Aggiunge nuovi lead (scouting)
    if (request.method === 'POST') {
      const body = await request.json();
      const leads = Array.isArray(body) ? body : [body];

      for (const lead of leads) {
        // Nota: Non sovrascriviamo le creations esistenti in caso di conflict, usiamo DO NOTHING
        await sql`
          INSERT INTO leads (id, name, address, type, website, phone_number, status, lead_status, reasoning, creations)
          VALUES (${lead.id}, ${lead.name}, ${lead.address}, ${lead.type}, ${lead.website}, ${lead.phoneNumber}, ${lead.status}, ${lead.leadStatus}, ${lead.reasoning}, ${JSON.stringify(lead.creations || [])})
          ON CONFLICT (id) DO NOTHING;
        `;
      }
      return new Response(JSON.stringify({ message: 'Leads saved' }), { status: 200 });
    }

    // PATCH: Aggiorna specificamente le creations (Salvataggio Sito)
    if (request.method === 'PATCH') {
      const { id, creations } = await request.json();
      await sql`
        UPDATE leads 
        SET creations = ${JSON.stringify(creations)}
        WHERE id = ${id};
      `;
      return new Response(JSON.stringify({ message: 'Creations updated' }), { status: 200 });
    }

    // PUT: Aggiorna lo stato di un lead
    if (request.method === 'PUT') {
      const { id, leadStatus } = await request.json();
      await sql`
        UPDATE leads 
        SET lead_status = ${leadStatus}
        WHERE id = ${id};
      `;
      return new Response(JSON.stringify({ message: 'Lead status updated' }), { status: 200 });
    }

    return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405 });

  } catch (error) {
    console.error("Database Error:", error);
    return new Response(JSON.stringify({ error: 'Database error', details: String(error) }), { status: 500 });
  }
}