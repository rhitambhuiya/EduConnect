const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('--- Starting Comprehensive College Portal Tests ---');

  // Test 1: Health check
  console.log('\n[1] Testing Health Check...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const health = await healthRes.json();
  if (health.status !== 'ok') throw new Error('Health check failed');
  console.log('✓ Health check passed:', health);

  // Test 2: Teacher Login
  console.log('\n[2] Testing Teacher Login (teacher@college.edu)...');
  const tLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'teacher@college.edu',
      password: 'password123',
      role: 'teacher'
    })
  });
  const tLogin = await tLoginRes.json();
  if (!tLoginRes.ok) throw new Error(`Teacher login failed: ${JSON.stringify(tLogin)}`);
  const teacherToken = tLogin.token;
  console.log('✓ Teacher login passed, teacher:', tLogin.user.name, 'Role:', tLogin.user.role);

  // Test 3: Student Login
  console.log('\n[3] Testing Student Login (student@college.edu)...');
  const sLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student@college.edu',
      password: 'password123',
      role: 'student'
    })
  });
  const sLogin = await sLoginRes.json();
  if (!sLoginRes.ok) throw new Error(`Student login failed: ${JSON.stringify(sLogin)}`);
  const studentToken = sLogin.token;
  console.log('✓ Student login passed, student:', sLogin.user.name, 'Role:', sLogin.user.role);

  // Test 4: Role-based cross-login protection
  console.log('\n[4] Testing Role Protection on Login...');
  const crossRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student@college.edu',
      password: 'password123',
      role: 'teacher' // Wrong role deliberately
    })
  });
  if (crossRes.status === 403) {
    console.log('✓ Cross-role login rejected with 403 Forbidden as expected');
  } else {
    throw new Error(`Expected 403, got ${crossRes.status}`);
  }

  // Test 5: Teacher creates class
  console.log('\n[5] Testing Class Creation by Teacher...');
  const createClassRes = await fetch(`${BASE_URL}/api/classes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherToken}`
    },
    body: JSON.stringify({
      name: 'Distributed Systems & Cloud Computing',
      code: 'CS450',
      description: 'Architecting distributed systems, consensus algorithms, microservices, and containerization.'
    })
  });
  const newClassData = await createClassRes.json();
  if (!createClassRes.ok) throw new Error(`Create class failed: ${JSON.stringify(newClassData)}`);
  const createdClass = newClassData.class;
  console.log('✓ Class created successfully:', createdClass.name, `(${createdClass.code}) ID: ${createdClass.id}`);

  // Test 6: Teacher uploads note
  console.log('\n[6] Testing Note Upload by Teacher...');
  const boundary = '--------------------------boundary' + Math.random().toString(36).substring(2);
  const fileContent = 'Module 1: Distributed Architectures and CAP Theorem Overview.';
  const bodyBuffer = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nCAP Theorem Lecture Slides\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="cap_theorem.txt"\r\nContent-Type: text/plain\r\n\r\n${fileContent}\r\n`),
    Buffer.from(`--${boundary}--\r\n`)
  ]);

  const noteUploadRes = await fetch(`${BASE_URL}/api/classes/${createdClass.id}/notes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${teacherToken}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: bodyBuffer
  });
  const noteData = await noteUploadRes.json();
  if (!noteUploadRes.ok) throw new Error(`Note upload failed: ${JSON.stringify(noteData)}`);
  console.log('✓ Note uploaded:', noteData.note.title, 'File:', noteData.note.originalName);

  // Test 7: Teacher posts announcement
  console.log('\n[7] Testing Announcement Creation by Teacher...');
  const annRes = await fetch(`${BASE_URL}/api/classes/${createdClass.id}/announcements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherToken}`
    },
    body: JSON.stringify({
      title: 'First lecture on CAP theorem scheduled',
      content: 'Welcome to CS450! The first live lecture is scheduled for Monday at 10 AM. Lecture notes have been posted.'
    })
  });
  const annData = await annRes.json();
  if (!annRes.ok) throw new Error(`Announcement creation failed: ${JSON.stringify(annData)}`);
  console.log('✓ Announcement created:', annData.announcement.title);

  // Test 8: Student views available classes
  console.log('\n[8] Testing Student View Available Classes...');
  const availRes = await fetch(`${BASE_URL}/api/classes`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const availClasses = await availRes.json();
  const targetClass = availClasses.find(c => c.id === createdClass.id);
  if (!targetClass) throw new Error('Created class not found in available classes');
  if (targetClass.isEnrolled) throw new Error('Student should not yet be enrolled in new class');
  console.log(`✓ Available classes loaded (${availClasses.length} total), target class enrollment status: isEnrolled=${targetClass.isEnrolled}`);

  // Test 9: Student enrolls in class
  console.log('\n[9] Testing Student Enrollment in Class...');
  const enrollRes = await fetch(`${BASE_URL}/api/classes/${createdClass.id}/enroll`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const enrollData = await enrollRes.json();
  if (!enrollRes.ok) throw new Error(`Enrollment failed: ${JSON.stringify(enrollData)}`);
  console.log('✓ Enrollment successful:', enrollData.message, 'Updated count:', enrollData.class.enrollmentCount);

  // Test 10: Duplicate Enrollment Prevention
  console.log('\n[10] Testing Duplicate Enrollment Prevention...');
  const dupEnrollRes = await fetch(`${BASE_URL}/api/classes/${createdClass.id}/enroll`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  if (dupEnrollRes.status === 400) {
    const dupData = await dupEnrollRes.json();
    console.log('✓ Duplicate enrollment properly blocked with 400:', dupData.error);
  } else {
    throw new Error(`Expected 400 on duplicate enrollment, got ${dupEnrollRes.status}`);
  }

  // Test 11: Student views class notes and downloads
  console.log('\n[11] Testing Student Access to Class Notes...');
  const sNotesRes = await fetch(`${BASE_URL}/api/classes/${createdClass.id}/notes`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const sNotes = await sNotesRes.json();
  if (!sNotesRes.ok || sNotes.length === 0) throw new Error('Student could not view class notes');
  console.log('✓ Student successfully retrieved notes, count:', sNotes.length);

  const downloadRes = await fetch(`${BASE_URL}/api/notes/${sNotes[0].id}/download`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  if (!downloadRes.ok) throw new Error(`Student download failed: ${downloadRes.status}`);
  const downloadedText = await downloadRes.text();
  console.log('✓ Student successfully downloaded note file:', downloadedText);

  // Test 12: Student views announcements
  console.log('\n[12] Testing Student Access to Announcements...');
  const sAnnRes = await fetch(`${BASE_URL}/api/classes/${createdClass.id}/announcements`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const sAnns = await sAnnRes.json();
  if (!sAnnRes.ok || sAnns.length === 0) throw new Error('Student could not view announcements');
  console.log('✓ Student successfully retrieved announcements, count:', sAnns.length);

  // Test 13: Student forbidden permissions test
  console.log('\n[13] Testing Student Forbidden Permissions (Upload Note, Create Announcement, Create Class)...');
  
  const sUploadForbidden = await fetch(`${BASE_URL}/api/classes/${createdClass.id}/notes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  if (sUploadForbidden.status !== 403) throw new Error(`Expected 403 for student upload, got ${sUploadForbidden.status}`);

  const sAnnForbidden = await fetch(`${BASE_URL}/api/classes/${createdClass.id}/announcements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({ title: 'Hack', content: 'Unauthorized' })
  });
  if (sAnnForbidden.status !== 403) throw new Error(`Expected 403 for student announcement, got ${sAnnForbidden.status}`);

  const sClassForbidden = await fetch(`${BASE_URL}/api/classes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({ name: 'Hack Class', code: 'HCK', description: 'None' })
  });
  if (sClassForbidden.status !== 403) throw new Error(`Expected 403 for student create class, got ${sClassForbidden.status}`);

  console.log('✓ All student permission restrictions verified: 403 Forbidden properly enforced');

  // Test 14: Teacher sees student in enrolled roster
  console.log('\n[14] Testing Teacher Enrolled Students Roster...');
  const rosterRes = await fetch(`${BASE_URL}/api/classes/${createdClass.id}/students`, {
    headers: { 'Authorization': `Bearer ${teacherToken}` }
  });
  const roster = await rosterRes.json();
  const enrolledStudent = roster.find(s => s.id === sLogin.user.id);
  if (!enrolledStudent) throw new Error('Student not found in teacher roster');
  console.log('✓ Teacher roster verified, enrolled student:', enrolledStudent.name, enrolledStudent.email);

  // Test 15: New Student Registration
  console.log('\n[15] Testing New Student Registration...');
  const randNum = Math.floor(Math.random() * 10000);
  const newStudentEmail = `samuel${randNum}@college.edu`;
  const regStudentRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Samuel Garcia',
      email: newStudentEmail,
      password: 'password123',
      role: 'student'
    })
  });
  const regStudentData = await regStudentRes.json();
  if (!regStudentRes.ok) throw new Error(`New student registration failed: ${JSON.stringify(regStudentData)}`);
  console.log('✓ New student registered:', regStudentData.user.name, 'Role:', regStudentData.user.role);

  // Test 16: New Teacher Registration
  console.log('\n[16] Testing New Teacher Registration...');
  const newTeacherEmail = `prof.chen${randNum}@college.edu`;
  const regTeacherRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Prof. David Chen',
      email: newTeacherEmail,
      password: 'password123',
      role: 'teacher'
    })
  });
  const regTeacherData = await regTeacherRes.json();
  if (!regTeacherRes.ok) throw new Error(`New teacher registration failed: ${JSON.stringify(regTeacherData)}`);
  console.log('✓ New teacher registered:', regTeacherData.user.name, 'Role:', regTeacherData.user.role);

  // Test 17: Teacher Deletes Study Material & Permissions
  console.log('\n[17] Testing Note Deletion Feature and Permission Security...');
  const noteToDeleteId = noteData.note.id;

  // Student tries to delete note -> 403 Forbidden
  const sDelForbidden = await fetch(`${BASE_URL}/api/notes/${noteToDeleteId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  if (sDelForbidden.status !== 403) throw new Error(`Expected 403 for student deleting note, got ${sDelForbidden.status}`);
  console.log('✓ Student cannot delete note: 403 Forbidden properly enforced');

  // New teacher tries to delete note from Dr. Miller's class -> 403 Forbidden
  const otherTeacherToken = regTeacherData.token;
  const otherTDelForbidden = await fetch(`${BASE_URL}/api/notes/${noteToDeleteId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${otherTeacherToken}` }
  });
  if (otherTDelForbidden.status !== 403) throw new Error(`Expected 403 for other teacher deleting note, got ${otherTDelForbidden.status}`);
  console.log('✓ Other teachers cannot delete note: 403 Forbidden properly enforced');

  // Owning teacher deletes note -> 200 OK
  const tDelSuccess = await fetch(`${BASE_URL}/api/notes/${noteToDeleteId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${teacherToken}` }
  });
  const tDelResult = await tDelSuccess.json();
  if (!tDelSuccess.ok) throw new Error(`Owning teacher delete failed: ${JSON.stringify(tDelResult)}`);
  console.log('✓ Owning teacher deleted note successfully:', tDelResult.message);

  // Verify note is gone from class notes list
  const verifyNotesRes = await fetch(`${BASE_URL}/api/classes/${createdClass.id}/notes`, {
    headers: { 'Authorization': `Bearer ${teacherToken}` }
  });
  const remainingNotes = await verifyNotesRes.json();
  if (remainingNotes.some(n => n.id === noteToDeleteId)) {
    throw new Error('Note was not removed from database!');
  }
  console.log('✓ Confirmed note is deleted from class notes list');

  // Test 18: Teacher Derolls Student from Class & Permissions
  console.log('\n[18] Testing Student Deroll Feature and Permission Security...');
  const studentToDerollId = sLogin.user.id;

  // Student tries to deroll someone -> 403 Forbidden
  const sDerollForbidden = await fetch(`${BASE_URL}/api/classes/${createdClass.id}/students/${studentToDerollId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  if (sDerollForbidden.status !== 403) throw new Error(`Expected 403 for student derolling, got ${sDerollForbidden.status}`);
  console.log('✓ Student cannot deroll students: 403 Forbidden properly enforced');

  // Other teacher tries to deroll student from Dr. Miller's class -> 403 Forbidden
  const otherTDerollForbidden = await fetch(`${BASE_URL}/api/classes/${createdClass.id}/students/${studentToDerollId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${otherTeacherToken}` }
  });
  if (otherTDerollForbidden.status !== 403) throw new Error(`Expected 403 for other teacher derolling, got ${otherTDerollForbidden.status}`);
  console.log('✓ Other teachers cannot deroll students: 403 Forbidden properly enforced');

  // Owning teacher derolls student -> 200 OK
  const tDerollSuccess = await fetch(`${BASE_URL}/api/classes/${createdClass.id}/students/${studentToDerollId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${teacherToken}` }
  });
  const tDerollResult = await tDerollSuccess.json();
  if (!tDerollSuccess.ok) throw new Error(`Owning teacher deroll failed: ${JSON.stringify(tDerollResult)}`);
  console.log('✓ Owning teacher derolled student successfully:', tDerollResult.message);

  // Verify student is no longer in roster
  const verifyRosterRes = await fetch(`${BASE_URL}/api/classes/${createdClass.id}/students`, {
    headers: { 'Authorization': `Bearer ${teacherToken}` }
  });
  const remainingStudents = await verifyRosterRes.json();
  if (remainingStudents.some(s => s.id === studentToDerollId)) {
    throw new Error('Student still exists in class roster after deroll!');
  }
  console.log('✓ Confirmed student is removed from class roster');

  // Verify derolled student cannot access class details/notes anymore -> 403
  const derolledAccessRes = await fetch(`${BASE_URL}/api/classes/${createdClass.id}`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  if (derolledAccessRes.status !== 403) {
    throw new Error(`Expected 403 for derolled student accessing class, got ${derolledAccessRes.status}`);
  }
  console.log('✓ Derolled student access blocked: 403 Forbidden properly enforced');

  // Test 19: Teacher creates timed assignment with attachment
  console.log('\n[19] Testing Teacher Creating Timed Assignment...');
  const promptPdfContent = '%PDF-1.4\n1 0 obj\n<< /Title (CS101 Problem Set) >>\nendobj\ntrailer\n<< >>\n%%EOF';
  const asgForm = new FormData();
  asgForm.append('title', 'Project Sprint 1: Full Stack Architecture');
  asgForm.append('description', 'Design and implement REST endpoints with proper error handling and documentation. Export your report as PDF.');
  asgForm.append('dueDate', new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString());
  asgForm.append('totalPoints', '100');
  asgForm.append('allowReupload', 'true');
  asgForm.append('file', new Blob([promptPdfContent], { type: 'application/pdf' }), 'Sprint1_Instructions.pdf');

  const createAsgRes = await fetch(`${BASE_URL}/api/assignments/class/cls_cs101`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${teacherToken}` },
    body: asgForm
  });
  const createAsgData = await createAsgRes.json();
  if (!createAsgRes.ok) throw new Error(`Create assignment failed: ${JSON.stringify(createAsgData)}`);
  const createdAsg = createAsgData.assignment;
  console.log('✓ Teacher created assignment:', createdAsg.title, 'AllowReupload:', createdAsg.allowReupload);

  // Test 20: Student views pending assignments
  console.log('\n[20] Testing Student Viewing Pending Assignments...');
  const studentPendingRes = await fetch(`${BASE_URL}/api/assignments/my-pending`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const studentPending = await studentPendingRes.json();
  if (!studentPendingRes.ok) throw new Error('Failed to get student pending assignments');
  console.log(`✓ Student has ${studentPending.length} pending assignment(s)`);

  // Test 21: Teacher views submissions roster (detecting who submitted vs who did not)
  console.log('\n[21] Testing Teacher Viewing Submissions Roster...');
  const rosterBeforeRes = await fetch(`${BASE_URL}/api/assignments/${createdAsg.id}/submissions`, {
    headers: { 'Authorization': `Bearer ${teacherToken}` }
  });
  const rosterBefore = await rosterBeforeRes.json();
  console.log(`✓ Roster verified: ${rosterBefore.submittedCount} submitted, ${rosterBefore.pendingCount} pending out of ${rosterBefore.totalEnrolled} enrolled`);
  const missingStudents = rosterBefore.roster.filter(r => !r.hasSubmitted);
  console.log(`✓ Identified ${missingStudents.length} student(s) who did not submit yet:`, missingStudents.map(s => s.studentName).join(', '));

  // Test 22: Student submits assignment PDF
  console.log('\n[22] Testing Student Submitting PDF Solution...');
  const studentPdfContent = '%PDF-1.4\n1 0 obj\n<< /Title (Student Solution) >>\nendobj\ntrailer\n<< >>\n%%EOF';
  const subForm = new FormData();
  subForm.append('file', new Blob([studentPdfContent], { type: 'application/pdf' }), 'Student_Solution_Sprint1.pdf');
  subForm.append('notes', 'Attached my architectural design document and test logs.');

  const submitRes = await fetch(`${BASE_URL}/api/assignments/${createdAsg.id}/submit`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${studentToken}` },
    body: subForm
  });
  const submitData = await submitRes.json();
  if (!submitRes.ok) throw new Error(`Student submission failed: ${JSON.stringify(submitData)}`);
  console.log('✓ Student submitted assignment successfully:', submitData.submission.originalName);

  // Test 23: Verify teacher now sees this student as SUBMITTED in roster
  console.log('\n[23] Testing Teacher Verification of Updated Submissions Roster...');
  const rosterAfterRes = await fetch(`${BASE_URL}/api/assignments/${createdAsg.id}/submissions`, {
    headers: { 'Authorization': `Bearer ${teacherToken}` }
  });
  const rosterAfter = await rosterAfterRes.json();
  const studentEntry = rosterAfter.roster.find(r => r.studentEmail === 'student@college.edu');
  if (!studentEntry || !studentEntry.hasSubmitted) {
    throw new Error('Teacher roster did not show student as submitted!');
  }
  console.log(`✓ Teacher verified student ${studentEntry.studentName} is marked SUBMITTED with file: ${studentEntry.submission.originalName}`);

  // Test 24: Student deletes submission to re-upload (allowed by teacher)
  console.log('\n[24] Testing Student Deleting Submission to Re-upload...');
  const delSubRes = await fetch(`${BASE_URL}/api/assignments/${createdAsg.id}/submission`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const delSubData = await delSubRes.json();
  if (!delSubRes.ok) throw new Error(`Delete submission failed: ${JSON.stringify(delSubData)}`);
  console.log('✓ Student deleted submission successfully:', delSubData.message);

  // Student re-uploads revised version
  const subForm2 = new FormData();
  subForm2.append('file', new Blob([studentPdfContent], { type: 'application/pdf' }), 'Student_Solution_Sprint1_v2.pdf');
  subForm2.append('notes', 'Version 2 with updated diagrams.');
  const reuploadRes = await fetch(`${BASE_URL}/api/assignments/${createdAsg.id}/submit`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${studentToken}` },
    body: subForm2
  });
  if (!reuploadRes.ok) throw new Error('Re-upload submission failed');
  console.log('✓ Student re-uploaded revised version 2 successfully');

  // Test 25: Teacher locks re-uploading and verifies student cannot delete/re-upload
  console.log('\n[25] Testing Teacher Locking Re-upload and Enforcing Lock...');
  const toggleRes = await fetch(`${BASE_URL}/api/assignments/${createdAsg.id}/toggle-reupload`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${teacherToken}` }
  });
  const toggleData = await toggleRes.json();
  if (toggleData.assignment.allowReupload !== false) throw new Error('Re-upload toggle failed to lock');
  console.log('✓ Teacher locked re-uploading:', toggleData.message);

  // Student attempts to delete/re-upload -> must be 403 Forbidden
  const blockedDelRes = await fetch(`${BASE_URL}/api/assignments/${createdAsg.id}/submission`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  if (blockedDelRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden when deleting locked submission, got ${blockedDelRes.status}`);
  }
  console.log('✓ Re-upload lock verified: HTTP 403 Forbidden properly returned when teacher disabled re-uploads');

  console.log('\n======================================================');
  console.log(' ALL 25 INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});

