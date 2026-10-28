const http = require('http');

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:5000${path}`);
    const headers = {};
    let body = null;

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      body = JSON.stringify(data);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(url, { method, headers }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          const json = responseBody ? JSON.parse(responseBody) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: responseBody });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING QUIZ END-TO-END INTEGRATION TEST ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate Teacher
    console.log('1. Authenticating teacher and students...');
    const teacherLogin = await request('POST', '/api/auth/login', {
      email: 'teacher@college.edu',
      password: 'password123',
      role: 'teacher'
    });
    assert(teacherLogin.status === 200 && teacherLogin.data.token, 'Teacher logged in successfully');
    const teacherToken = teacherLogin.data.token;

    // Authenticate Alice (Student)
    const aliceLogin = await request('POST', '/api/auth/login', {
      email: 'student@college.edu',
      password: 'password123',
      role: 'student'
    });
    assert(aliceLogin.status === 200 && aliceLogin.data.token, 'Alice (Student) logged in successfully');
    const aliceToken = aliceLogin.data.token;

    // Get Teacher's class
    const classesRes = await request('GET', '/api/classes/my', null, teacherToken);
    assert(classesRes.status === 200 && classesRes.data.length > 0, 'Found classes for teacher');
    const classId = classesRes.data[0].id;
    console.log(`   Using Class ID: ${classId} (${classesRes.data[0].code})`);

    // 2. Teacher creates a Quiz
    console.log('\n2. Teacher creating and scheduling a Quiz with Single MCQ, Multi MCQ, and Paragraph...');
    const now = new Date();
    const startTime = new Date(now.getTime() - 60000).toISOString(); // 1 min ago
    const endTime = new Date(now.getTime() + 24 * 3600 * 1000).toISOString(); // tomorrow

    const quizPayload = {
      title: 'Automated Test: Data Structures & Algorithms Quiz',
      description: 'Comprehensive test covering AVL trees, Graph traversal, and dynamic programming.',
      durationMinutes: 45,
      startTime,
      endTime,
      questions: [
        {
          id: 'q_single_1',
          type: 'single',
          question: 'What is the worst-case search complexity of a balanced binary search tree (AVL Tree)?',
          points: 5,
          options: ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'],
          correctAnswer: 1, // 'O(log n)'
          explanation: 'AVL trees remain strictly height-balanced, maintaining O(log n) maximum depth.'
        },
        {
          id: 'q_multi_1',
          type: 'multiple',
          question: 'Which of the following algorithm paradigms use a greedy approach? (Select all that apply)',
          points: 10,
          options: [
            'Dijkstra’s Shortest Path Algorithm',
            'Prim’s Minimum Spanning Tree Algorithm',
            'Floyd-Warshall All-Pairs Shortest Path',
            'Huffman Coding'
          ],
          correctAnswers: [0, 1, 3], // Dijkstra, Prim, Huffman
          explanation: 'Dijkstra, Prim, and Huffman choose the local optimum at each step. Floyd-Warshall uses Dynamic Programming.'
        },
        {
          id: 'q_para_1',
          type: 'paragraph',
          question: 'Explain the difference between Dijkstra’s algorithm and Bellman-Ford algorithm, particularly regarding negative weight edges.',
          points: 15,
          explanation: 'Bellman-Ford relaxes all edges V-1 times and detects negative cycles, while Dijkstra greedily visits vertices and fails on negative edges.'
        }
      ]
    };

    const createQuizRes = await request('POST', `/api/quizzes/class/${classId}`, quizPayload, teacherToken);
    assert(createQuizRes.status === 201 && createQuizRes.data.id, 'Quiz created successfully');
    const createdQuizId = createQuizRes.data.id;
    assert(createQuizRes.data.totalPoints === 30, 'Total points correctly calculated as 30');

    // 3. Student fetches pending quizzes
    console.log('\n3. Student checking pending quizzes list...');
    const pendingRes = await request('GET', '/api/quizzes/my-pending', null, aliceToken);
    assert(pendingRes.status === 200, 'Student pending quizzes endpoint returned 200');
    const foundPending = pendingRes.data.find(q => q.id === createdQuizId);
    assert(foundPending !== undefined, 'Created quiz appears in student pending quizzes');
    assert(foundPending && foundPending.status === 'pending', 'Quiz status is "pending"');

    // 4. Security check: Student fetches quiz before taking
    console.log('\n4. Security check: Verifying answers and explanations are stripped for student before attempting...');
    const quizDetailRes = await request('GET', `/api/quizzes/${createdQuizId}`, null, aliceToken);
    assert(quizDetailRes.status === 200, 'Quiz detail returned 200');
    const q1 = quizDetailRes.data.questions.find(q => q.id === 'q_single_1');
    assert(q1.correctAnswer === undefined, 'Security: Single MCQ correctAnswer is hidden from student');
    assert(q1.explanation === undefined, 'Security: Question explanation is hidden before attempt');
    const q2 = quizDetailRes.data.questions.find(q => q.id === 'q_multi_1');
    assert(q2.correctAnswers === undefined, 'Security: Multi MCQ correctAnswers array is hidden from student');

    // 5. Student submits attempt
    console.log('\n5. Student submitting quiz attempt...');
    const submitPayload = {
      answers: [
        {
          questionId: 'q_single_1',
          type: 'single',
          selectedOption: 1 // Correct: O(log n)
        },
        {
          questionId: 'q_multi_1',
          type: 'multiple',
          selectedOptions: [0, 1, 3] // Correct: Dijkstra, Prim, Huffman
        },
        {
          questionId: 'q_para_1',
          type: 'paragraph',
          answerText: 'Dijkstra is a greedy algorithm with O((V+E)log V) complexity that assumes all edge weights are non-negative. Bellman-Ford runs in O(VE) dynamic programming time and can handle negative weights and detect negative weight cycles.'
        }
      ]
    };

    const attemptRes = await request('POST', `/api/quizzes/${createdQuizId}/attempt`, submitPayload, aliceToken);
    assert(attemptRes.status === 201, 'Quiz attempt submitted successfully');
    const attempt = attemptRes.data.attempt;
    assert(attempt.mcqScore === 15, `Auto-grading: MCQ score is 15/15 (got ${attempt.mcqScore})`);
    assert(attempt.paragraphScore === 0, 'Paragraph score is initially 0 awaiting teacher review');
    assert(attempt.isGraded === false, 'Quiz marked as not fully graded because paragraph question exists');
    const attemptId = attempt.id;

    // 6. Student reviews attempt & verifies answers
    console.log('\n6. Student reviewing attempt & answer verification...');
    const reviewRes = await request('GET', `/api/quizzes/${createdQuizId}/review`, null, aliceToken);
    assert(reviewRes.status === 200, 'Student review endpoint returned 200');
    const reviewQ1 = reviewRes.data.questions.find(q => q.questionId === 'q_single_1');
    assert(reviewQ1.studentAnswer.isCorrect === true, 'Verification: Single MCQ marked isCorrect: true');
    assert(reviewQ1.studentAnswer.pointsEarned === 5, 'Verification: Single MCQ pointsEarned: 5');
    assert(reviewQ1.correctAnswer === 1, 'Verification: Correct answer shown in review');
    assert(reviewQ1.explanation.length > 0, 'Verification: Explanation revealed to student after attempt');

    const reviewQ2 = reviewRes.data.questions.find(q => q.questionId === 'q_multi_1');
    assert(reviewQ2.studentAnswer.isCorrect === true, 'Verification: Multi MCQ marked isCorrect: true');
    assert(reviewQ2.studentAnswer.pointsEarned === 10, 'Verification: Multi MCQ pointsEarned: 10');

    // 7. Teacher grades paragraph answer
    console.log('\n7. Teacher evaluating paragraph question with marks allotment and feedback remarks...');
    const gradePayload = {
      grades: [
        {
          questionId: 'q_para_1',
          pointsEarned: 14, // 14 out of 15 marks
          teacherRemarks: 'Superb and thorough explanation! Accurately highlighted time complexities and negative cycle detection.'
        }
      ]
    };

    const gradeRes = await request('PUT', `/api/quizzes/attempts/${attemptId}/grade`, gradePayload, teacherToken);
    assert(gradeRes.status === 200, 'Teacher grading request succeeded');
    const updatedAttempt = gradeRes.data.attempt;
    assert(updatedAttempt.paragraphScore === 14, `Paragraph score updated to 14 (got ${updatedAttempt.paragraphScore})`);
    assert(updatedAttempt.totalScore === 29, `Total score updated to 29/30 (got ${updatedAttempt.totalScore})`);
    assert(updatedAttempt.isGraded === true, 'Attempt is now marked as isGraded: true');

    // 8. Student verifies teacher remarks
    console.log('\n8. Student verifies teacher remarks and allotted marks on review...');
    const reviewAfterGrade = await request('GET', `/api/quizzes/${createdQuizId}/review`, null, aliceToken);
    const reviewQ3 = reviewAfterGrade.data.questions.find(q => q.questionId === 'q_para_1');
    assert(reviewQ3.studentAnswer.pointsEarned === 14, 'Student sees allotted marks: 14');
    assert(reviewQ3.studentAnswer.teacherRemarks.includes('Superb and thorough'), 'Student sees teacher remarks');

    // 9. Overall Summary & Analytics
    console.log('\n9. Checking overall summary analytics for both student and teacher...');
    const summaryRes = await request('GET', `/api/quizzes/${createdQuizId}/summary`, null, aliceToken);
    assert(summaryRes.status === 200, 'Summary endpoint returned 200');
    assert(summaryRes.data.totalAttempted >= 1, `Summary: totalAttempted is ${summaryRes.data.totalAttempted}`);
    assert(summaryRes.data.highestScore === 29, `Summary: highestScore is 29 (got ${summaryRes.data.highestScore})`);
    assert(summaryRes.data.averageScore === 29, `Summary: averageScore is 29 (got ${summaryRes.data.averageScore})`);
    assert(summaryRes.data.medianScore === 29, `Summary: medianScore is 29 (got ${summaryRes.data.medianScore})`);
    assert(summaryRes.data.topScorers && summaryRes.data.topScorers.length > 0, 'Summary: topScorers list is populated');
    assert(summaryRes.data.topScorers[0].score === 29, 'Summary: topScorer has score 29');

    // 10. Confirm quiz is no longer pending for Alice
    console.log('\n10. Checking student pending list after completion...');
    const pendingAfter = await request('GET', '/api/quizzes/my-pending', null, aliceToken);
    const stillPending = pendingAfter.data.some(q => q.id === createdQuizId);
    assert(!stillPending, 'Completed quiz no longer appears in student pending quizzes');

    console.log(`\n===============================================`);
    console.log(` TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log(`===============================================`);
  } catch (err) {
    console.error('Test execution error:', err);
  }
}

runTests();
