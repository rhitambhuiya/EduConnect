const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'server', 'data', 'db.json');

const raw = fs.readFileSync(DB_FILE, 'utf-8');
const data = JSON.parse(raw);

console.log('--- BEFORE CLEANUP ---');
console.log('Users:', data.users.length);
console.log('Classes:', data.classes.length);
console.log('Assignments:', (data.assignments || []).length);
console.log('Quizzes:', (data.quizzes || []).length);

// Canonical IDs
const validUserIds = new Set(['usr_teacher_1', 'usr_student_1', 'usr_student_2']);
const validClassIds = new Set(['cls_cs101', 'cls_cs202', 'cls_cs304']);
const validAssignmentIds = new Set(['asg_cs101_1', 'asg_cs202_1']);
const validQuizIds = new Set(['qiz_cs101_1']);

// Filter users
data.users = data.users.filter(u => validUserIds.has(u.id));

// Filter classes
data.classes = data.classes.filter(c => validClassIds.has(c.id));

// Filter enrollments
data.enrollments = data.enrollments.filter(e => validUserIds.has(e.studentId) && validClassIds.has(e.classId));

// Filter notes
data.notes = data.notes.filter(n => validClassIds.has(n.classId));

// Filter announcements
data.announcements = data.announcements.filter(a => validClassIds.has(a.classId));

// Filter assignments
data.assignments = (data.assignments || []).filter(a => validAssignmentIds.has(a.id) && validClassIds.has(a.classId));

// Filter submissions
data.submissions = (data.submissions || []).filter(s => validAssignmentIds.has(s.assignmentId) && validUserIds.has(s.studentId));

// Filter quizzes
data.quizzes = (data.quizzes || []).filter(q => validQuizIds.has(q.id) && validClassIds.has(q.classId));

// Filter quiz attempts
data.quizAttempts = (data.quizAttempts || []).filter(att => validQuizIds.has(att.quizId) && validUserIds.has(att.studentId));

console.log('\n--- AFTER CLEANUP ---');
console.log('Users:', data.users.length);
data.users.forEach(u => console.log(`  - ${u.name} (${u.email}) [${u.role}]`));

console.log('Classes:', data.classes.length);
data.classes.forEach(c => console.log(`  - [${c.code}] ${c.name} (ID: ${c.id})`));

console.log('Assignments:', data.assignments.length);
data.assignments.forEach(a => console.log(`  - ${a.title}`));

console.log('Quizzes:', data.quizzes.length);
data.quizzes.forEach(q => console.log(`  - ${q.title}`));

fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
console.log('\nCleaned db.json saved successfully!');
