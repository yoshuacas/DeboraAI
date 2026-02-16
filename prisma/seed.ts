import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@deboraai.local' },
    update: {},
    create: {
      email: 'admin@deboraai.local',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  console.log('Created admin user:', admin.email);

  // Create a test customer user
  const customerPassword = await bcrypt.hash('customer123', 10);

  const customer = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: {
      email: 'customer@test.com',
      password: customerPassword,
      name: 'Test Customer',
      role: 'CUSTOMER',
    },
  });

  console.log('Created customer user:', customer.email);

  // Create a lawyer user with Professional subscription
  const lawyerPassword = await bcrypt.hash('lawyer123', 10);

  const lawyer = await prisma.user.upsert({
    where: { email: 'lawyer@deboraai.local' },
    update: {},
    create: {
      email: 'lawyer@deboraai.local',
      password: lawyerPassword,
      name: 'María García López',
      firstName: 'María',
      lastName: 'García López',
      phone: '+34 91 123 4567',
      contactEmail: 'maria.garcia@bufete-garcia.es',
      contactAddress: 'Calle Mayor 123, 28013 Madrid, España',
      role: 'CUSTOMER',
      subscriptionPlan: 'PROFESSIONAL',
      subscriptionEnds: new Date('2026-12-31'),
    },
  });

  console.log('Created lawyer user:', lawyer.email);

  // Create clients for the lawyer
  const client1 = await prisma.client.create({
    data: {
      email: 'juan.perez@example.com',
      firstName: 'Juan',
      lastName: 'Pérez Martínez',
      phone: '+34 600 111 222',
      contactEmail: 'juan.perez@example.com',
      contactAddress: 'Calle Sol 45, 28001 Madrid',
      dateOfBirth: new Date('1985-06-15'),
      idNumber: '12345678A',
      lawyerId: lawyer.id,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      email: 'ana.rodriguez@example.com',
      firstName: 'Ana',
      lastName: 'Rodríguez Silva',
      phone: '+34 600 333 444',
      contactEmail: 'ana.rodriguez@example.com',
      contactAddress: 'Avenida de la Constitución 89, 28002 Madrid',
      dateOfBirth: new Date('1990-03-22'),
      idNumber: '87654321B',
      lawyerId: lawyer.id,
    },
  });

  const client3 = await prisma.client.create({
    data: {
      email: 'carlos.sanchez@example.com',
      firstName: 'Carlos',
      lastName: 'Sánchez Ruiz',
      phone: '+34 600 555 666',
      contactEmail: 'carlos.sanchez@example.com',
      contactAddress: 'Plaza España 12, 28008 Madrid',
      dateOfBirth: new Date('1978-11-30'),
      idNumber: '11223344C',
      lawyerId: lawyer.id,
    },
  });

  console.log('Created 3 clients');

  // Create cases for clients
  const case1 = await prisma.case.create({
    data: {
      name: 'Compraventa de inmueble - Calle Alcalá',
      court: 'Juzgado de Primera Instancia nº 5 de Madrid',
      status: 'IN_PROGRESS',
      clientId: client1.id,
    },
  });

  const case2 = await prisma.case.create({
    data: {
      name: 'Herencia de bienes - Familia Pérez',
      court: null,
      status: 'OPEN',
      clientId: client1.id,
    },
  });

  const case3 = await prisma.case.create({
    data: {
      name: 'Litigio laboral - Despido improcedente',
      court: 'Juzgado de lo Social nº 12 de Madrid',
      status: 'IN_PROGRESS',
      clientId: client2.id,
    },
  });

  const case4 = await prisma.case.create({
    data: {
      name: 'Divorcio contencioso',
      court: 'Juzgado de Familia nº 8 de Madrid',
      status: 'OPEN',
      clientId: client2.id,
    },
  });

  const case5 = await prisma.case.create({
    data: {
      name: 'Reclamación de cantidad - Impago de servicios',
      court: 'Juzgado de Primera Instancia nº 15 de Madrid',
      status: 'CLOSED',
      clientId: client3.id,
    },
  });

  console.log('Created 5 cases');

  // Create support documents
  await prisma.supportDocument.create({
    data: {
      name: 'Escritura de compraventa original',
      fileUrl: '/uploads/support/escritura-compraventa-001.pdf',
      fileType: 'application/pdf',
      summary: 'Escritura pública de compraventa del inmueble situado en Calle Alcalá 234',
      tags: JSON.stringify(['inmobiliario', 'escritura', 'compraventa']),
      caseId: case1.id,
    },
  });

  await prisma.supportDocument.create({
    data: {
      name: 'Nota simple registral',
      fileUrl: '/uploads/support/nota-simple-001.pdf',
      fileType: 'application/pdf',
      summary: 'Nota simple del Registro de la Propiedad actualizada',
      tags: JSON.stringify(['registro', 'propiedad', 'nota-simple']),
      caseId: case1.id,
    },
  });

  await prisma.supportDocument.create({
    data: {
      name: 'Contrato de trabajo',
      fileUrl: '/uploads/support/contrato-trabajo-001.pdf',
      fileType: 'application/pdf',
      summary: 'Contrato de trabajo firmado con la empresa demandada',
      tags: JSON.stringify(['laboral', 'contrato', 'trabajo']),
      caseId: case3.id,
    },
  });

  await prisma.supportDocument.create({
    data: {
      name: 'Carta de despido',
      fileUrl: '/uploads/support/carta-despido-001.pdf',
      fileType: 'application/pdf',
      summary: 'Carta de despido recibida por el trabajador',
      tags: JSON.stringify(['laboral', 'despido', 'documentación']),
      caseId: case3.id,
    },
  });

  console.log('Created 4 support documents');

  // Create generated documents
  await prisma.generatedDocument.create({
    data: {
      name: 'Demanda de compraventa',
      fileUrl: '/uploads/generated/demanda-compraventa-001.pdf',
      fileType: 'application/pdf',
      summary: 'Demanda judicial para reclamar el cumplimiento del contrato de compraventa',
      tags: JSON.stringify(['demanda', 'inmobiliario', 'generado']),
      caseId: case1.id,
    },
  });

  await prisma.generatedDocument.create({
    data: {
      name: 'Escrito de contestación a la demanda',
      fileUrl: '/uploads/generated/contestacion-laboral-001.pdf',
      fileType: 'application/pdf',
      summary: 'Contestación a la demanda presentada por la empresa',
      tags: JSON.stringify(['contestacion', 'laboral', 'generado']),
      caseId: case3.id,
    },
  });

  await prisma.generatedDocument.create({
    data: {
      name: 'Convenio regulador',
      fileUrl: '/uploads/generated/convenio-regulador-001.pdf',
      fileType: 'application/pdf',
      summary: 'Propuesta de convenio regulador para el divorcio',
      tags: JSON.stringify(['convenio', 'familia', 'divorcio', 'generado']),
      caseId: case4.id,
    },
  });

  console.log('Created 3 generated documents');

  // Create library documents
  await prisma.libraryDocument.create({
    data: {
      name: 'Código Civil Español',
      fileUrl: '/uploads/library/codigo-civil.pdf',
      fileType: 'application/pdf',
      summary: 'Texto refundido del Código Civil Español actualizado',
      tags: JSON.stringify(['legislacion', 'codigo-civil', 'referencia']),
      lawyerId: lawyer.id,
    },
  });

  await prisma.libraryDocument.create({
    data: {
      name: 'Estatuto de los Trabajadores',
      fileUrl: '/uploads/library/estatuto-trabajadores.pdf',
      fileType: 'application/pdf',
      summary: 'Texto completo del Estatuto de los Trabajadores',
      tags: JSON.stringify(['legislacion', 'laboral', 'estatuto']),
      lawyerId: lawyer.id,
    },
  });

  await prisma.libraryDocument.create({
    data: {
      name: 'Sentencia TS 123/2025 - Despido improcedente',
      fileUrl: '/uploads/library/sentencia-ts-123-2025.pdf',
      fileType: 'application/pdf',
      summary: 'Sentencia del Tribunal Supremo sobre criterios de despido improcedente',
      tags: JSON.stringify(['jurisprudencia', 'laboral', 'despido', 'tribunal-supremo']),
      lawyerId: lawyer.id,
    },
  });

  await prisma.libraryDocument.create({
    data: {
      name: 'Formulario demanda civil',
      fileUrl: '/uploads/library/formulario-demanda-civil.pdf',
      fileType: 'application/pdf',
      summary: 'Formulario estándar para presentación de demandas civiles',
      tags: JSON.stringify(['formulario', 'civil', 'demanda']),
      lawyerId: lawyer.id,
    },
  });

  console.log('Created 4 library documents');

  // Create templates
  await prisma.template.create({
    data: {
      name: 'Plantilla - Contrato de compraventa',
      templateType: 'SALE_CONTRACT',
      fileUrl: '/uploads/templates/contrato-compraventa.docx',
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      summary: 'Plantilla estándar para contratos de compraventa de inmuebles',
      tags: JSON.stringify(['plantilla', 'compraventa', 'inmobiliario']),
      lawyerId: lawyer.id,
    },
  });

  await prisma.template.create({
    data: {
      name: 'Plantilla - Demanda civil',
      templateType: 'LAWSUIT',
      fileUrl: '/uploads/templates/demanda-civil.docx',
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      summary: 'Plantilla base para demandas en procedimiento civil ordinario',
      tags: JSON.stringify(['plantilla', 'demanda', 'civil']),
      lawyerId: lawyer.id,
    },
  });

  await prisma.template.create({
    data: {
      name: 'Plantilla - Poder notarial',
      templateType: 'POWER_OF_ATTORNEY',
      fileUrl: '/uploads/templates/poder-notarial.docx',
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      summary: 'Plantilla de poder notarial para representación legal',
      tags: JSON.stringify(['plantilla', 'poder', 'notarial']),
      lawyerId: lawyer.id,
    },
  });

  await prisma.template.create({
    data: {
      name: 'Plantilla - Contrato de arrendamiento',
      templateType: 'RENTAL_AGREEMENT',
      fileUrl: '/uploads/templates/contrato-arrendamiento.docx',
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      summary: 'Plantilla para contratos de arrendamiento de vivienda',
      tags: JSON.stringify(['plantilla', 'arrendamiento', 'alquiler']),
      lawyerId: lawyer.id,
    },
  });

  await prisma.template.create({
    data: {
      name: 'Plantilla - Acuerdo de confidencialidad (NDA)',
      templateType: 'NDA',
      fileUrl: '/uploads/templates/nda.docx',
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      summary: 'Plantilla de acuerdo de confidencialidad bilateral',
      tags: JSON.stringify(['plantilla', 'nda', 'confidencialidad']),
      lawyerId: lawyer.id,
    },
  });

  console.log('Created 5 templates');

  // Create calendar events
  await prisma.calendarEvent.create({
    data: {
      title: 'Vista judicial - Compraventa Calle Alcalá',
      description: 'Vista en el Juzgado de Primera Instancia nº 5 de Madrid',
      eventDate: new Date('2026-03-15T10:00:00'),
      eventType: 'HEARING',
      caseId: case1.id,
      lawyerId: lawyer.id,
    },
  });

  await prisma.calendarEvent.create({
    data: {
      title: 'Plazo presentación documentación - Herencia',
      description: 'Fecha límite para presentar documentación adicional',
      eventDate: new Date('2026-02-28T23:59:00'),
      eventType: 'DEADLINE',
      caseId: case2.id,
      lawyerId: lawyer.id,
    },
  });

  await prisma.calendarEvent.create({
    data: {
      title: 'Acto de conciliación - Despido improcedente',
      description: 'Acto de conciliación previo en el SMAC',
      eventDate: new Date('2026-03-01T09:30:00'),
      eventType: 'HEARING',
      caseId: case3.id,
      lawyerId: lawyer.id,
    },
  });

  await prisma.calendarEvent.create({
    data: {
      title: 'Reunión con cliente - Divorcio',
      description: 'Reunión para revisar el convenio regulador propuesto',
      eventDate: new Date('2026-02-20T16:00:00'),
      eventType: 'MEETING',
      caseId: case4.id,
      lawyerId: lawyer.id,
    },
  });

  await prisma.calendarEvent.create({
    data: {
      title: 'Presentación de demanda',
      description: 'Plazo máximo para presentar la demanda en el juzgado',
      eventDate: new Date('2026-02-25T14:00:00'),
      eventType: 'FILING',
      caseId: case1.id,
      lawyerId: lawyer.id,
    },
  });

  await prisma.calendarEvent.create({
    data: {
      title: 'Reunión - Consulta nuevo cliente',
      description: 'Primera consulta con potencial nuevo cliente',
      eventDate: new Date('2026-02-18T11:00:00'),
      eventType: 'MEETING',
      lawyerId: lawyer.id,
    },
  });

  console.log('Created 6 calendar events');

  console.log('\nSeed completed successfully!');
  console.log('-----------------------------------');
  console.log('Admin: admin@deboraai.local / admin123');
  console.log('Lawyer: lawyer@deboraai.local / lawyer123');
  console.log('Customer: customer@test.com / customer123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
