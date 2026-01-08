import { sql } from '@vercel/postgres';
 
export default async function handler(request: Request) {
  try {
    // Tabella per i Lead (Aziende) - Aggiunta colonna 'creations'
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
        creations TEXT, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tabella per i Messaggi (Inbox)
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        business_id VARCHAR(255) REFERENCES leads(id),
        sender VARCHAR(50),
        content TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Tentativo di migrazione per database esistenti (aggiunge colonna se manca)
    try {
      await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS creations TEXT;`;
    } catch (e) {
      console.log("Column likely exists or migration not supported in this context");
    }

    return new Response(JSON.stringify({ message: 'Database tables created/updated successfully' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}