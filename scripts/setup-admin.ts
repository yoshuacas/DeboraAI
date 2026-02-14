#!/usr/bin/env ts-node

/**
 * Setup Admin User Script
 *
 * Creates the initial admin user for DeboraAI.
 * Run with: npm run setup:admin
 *
 * Default credentials:
 * - Email: admin@deboraai.local
 * - Password: admin123
 * - Name: Admin User
 *
 * For custom credentials, set environment variables:
 * - ADMIN_EMAIL
 * - ADMIN_PASSWORD
 * - ADMIN_NAME
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('='.repeat(60));
  console.log('DeboraAI Admin User Setup');
  console.log('='.repeat(60));

  // Get credentials from environment or use defaults
  const email = process.env.ADMIN_EMAIL || 'admin@deboraai.local';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.env.ADMIN_NAME || 'Admin User';

  console.log(`\nCreating admin user:`);
  console.log(`  Email: ${email}`);
  console.log(`  Name: ${name}`);
  console.log(`  Role: ADMIN`);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`\n⚠️  User with email ${email} already exists.`);
    console.log(`   User ID: ${existingUser.id}`);
    console.log(`   Role: ${existingUser.role}`);

    // Ask if we should update the password
    if (existingUser.role === 'ADMIN') {
      console.log(`\n✓ Admin user already configured.`);
      return;
    } else {
      console.log(`\n⚠️  Existing user is not an admin. Updating role...`);

      const hashedPassword = await hashPassword(password);

      await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          role: 'ADMIN',
        },
      });

      console.log(`✓ User updated to ADMIN role.`);
      return;
    }
  }

  // Hash password
  console.log(`\nHashing password...`);
  const hashedPassword = await hashPassword(password);

  // Create admin user
  console.log(`Creating user in database...`);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'ADMIN',
    },
  });

  console.log(`\n✓ Admin user created successfully!`);
  console.log(`\nCredentials:`);
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  User ID: ${user.id}`);
  console.log(`\nYou can now log in at: http://localhost:3000/login`);
  console.log('='.repeat(60));
}

main()
  .catch((error) => {
    console.error('\n✗ Error creating admin user:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
