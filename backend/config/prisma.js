const { PrismaClient } = require('@prisma/client');

// Reuse a single client across the whole app instead of creating a new one per file
const prisma = new PrismaClient();

module.exports = prisma;
