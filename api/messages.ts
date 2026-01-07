import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  try {
    // AUTO-FIX: Crea tabella se non esiste
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        business_id VARCHAR(255) REFERENCES leads(id),
        sender VARCHAR(50),
        content TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    if (request.method === 'GET') {
      const { rows } = await sql`
        SELECT m.*, l.name as business_name 
        FROM messages m
        JOIN leads l ON m.business_id = l.id
        ORDER BY m.timestamp DESC
      `;

      const messages = rows.map(row => ({
        id: row.id,
        businessId: row.business_id,
        businessName: row.business_name,
        sender: row.sender,
        content: row.content,
        timestamp: row.timestamp
      }));

      return new Response(JSON.stringify(messages), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'POST') {
      const msg = await request.json();
      
      await sql`
        INSERT INTO messages (id, business_id, sender, content, timestamp)
        VALUES (${msg.id}, ${msg.businessId}, ${msg.sender}, ${msg.content}, NOW());
      `;

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
  }
}