import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  try {
    // AUTO-FIX: Assicura che la tabella esista sempre prima di interrogarla
    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        type VARCHAR(100),
        website VARCHAR(255),
        phone_number VARCHAR(50),
        status VARCHAR(50),
        lead_status VARCHAR(50),
        reasoning TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // GET: Recupera tutti i lead
    if (request.method === 'GET') {
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
        reasoning: row.reasoning
      }));

      return new Response(JSON.stringify(leads), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // POST: Aggiunge nuovi lead
    if (request.method === 'POST') {
      const body = await request.json();
      const leads = Array.isArray(body) ? body : [body];

      for (const lead of leads) {
        await sql`
          INSERT INTO leads (id, name, address, type, website, phone_number, status, lead_status, reasoning)
          VALUES (${lead.id}, ${lead.name}, ${lead.address}, ${lead.type}, ${lead.website}, ${lead.phoneNumber}, ${lead.status}, ${lead.leadStatus}, ${lead.reasoning})
          ON CONFLICT (id) DO NOTHING;
        `;
      }

      return new Response(JSON.stringify({ message: 'Leads saved' }), { status: 200 });
    }

    // PUT: Aggiorna lo stato di un lead
    if (request.method === 'PUT') {
      const { id, leadStatus } = await request.json();
      
      await sql`
        UPDATE leads 
        SET lead_status = ${leadStatus}
        WHERE id = ${id};
      `;

      return new Response(JSON.stringify({ message: 'Lead updated' }), { status: 200 });
    }

    return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405 });

  } catch (error) {
    console.error("Database Error:", error);
    return new Response(JSON.stringify({ error: 'Database error', details: String(error) }), { status: 500 });
  }
}