import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  try {
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
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
  }
}