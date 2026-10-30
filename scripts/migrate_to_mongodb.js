require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const models = require('../server/models');

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('ERROR: MONGODB_URI is not set in your .env file.');
    console.error('Please set MONGODB_URI=mongodb+srv://... in .env before running migration.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas...');
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB Atlas successfully!');
  } catch (err) {
    console.error('Failed to connect to MongoDB Atlas:', err.message);
    process.exit(1);
  }

  // Load local JSON data
  const dbJsonPath = path.join(__dirname, '..', 'server', 'data', 'db.json');
  const questionBankPath = path.join(__dirname, '..', 'server', 'data', 'question_bank.json');

  if (!fs.existsSync(dbJsonPath)) {
    console.error('Local db.json not found at:', dbJsonPath);
    process.exit(1);
  }

  const dbData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
  let questionBank = [];
  if (fs.existsSync(questionBankPath)) {
    questionBank = JSON.parse(fs.readFileSync(questionBankPath, 'utf8'));
  }

  console.log('\n--- Migrating Collections ---');

  const collections = [
    { name: 'users', model: models.User, data: dbData.users || [] },
    { name: 'classes', model: models.Class, data: dbData.classes || [] },
    { name: 'enrollments', model: models.Enrollment, data: dbData.enrollments || [] },
    { name: 'notes', model: models.Note, data: dbData.notes || [] },
    { name: 'announcements', model: models.Announcement, data: dbData.announcements || [] },
    { name: 'assignments', model: models.Assignment, data: dbData.assignments || [] },
    { name: 'submissions', model: models.Submission, data: dbData.submissions || [] },
    { name: 'quizzes', model: models.Quiz, data: dbData.quizzes || [] },
    { name: 'quizAttempts', model: models.QuizAttempt, data: dbData.quizAttempts || [] },
    { name: 'questionBank', model: models.QuestionBank, data: questionBank }
  ];

  for (const col of collections) {
    console.log(`Migrating ${col.name} (${col.data.length} records)...`);
    for (const item of col.data) {
      // Upsert by 'id' so running migration multiple times doesn't duplicate
      await col.model.findOneAndUpdate(
        { id: item.id },
        { $set: item },
        { upsert: true, new: true }
      );
    }
    console.log(`✓ ${col.name} migrated (${col.data.length} records).`);
  }

  console.log('\n🎉 ALL DATA HAS BEEN SUCCESSFULLY MIGRATED TO MONGODB ATLAS!');
  await mongoose.disconnect();
  console.log('Database connection closed.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

