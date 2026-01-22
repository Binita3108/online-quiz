const supabaseUrl = 'https://fzyvguzoqgbjuduomrqo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eXZndXpvcWdianVkdW9tcnFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwOTYxNzksImV4cCI6MjA4NDY3MjE3OX0.rW9fgpT9Y0EMCJcjUa0d4PIlKtapICLEcgGEVTM9R6k';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let currentUserName = "";
let timerInterval;
const mainContent = document.getElementById('main-content');
const statusMsg = document.getElementById('status-msg');

function saveUserAndLoadQuizzes() 
{
    const nameInput = document.getElementById('username');
    if (!nameInput.value.trim()) 
    {
        alert("Please enter your name");
        return;
    }
    currentUserName = nameInput.value;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('quiz-list').style.display = 'grid';
    loadQuizzes();
}

async function loadQuizzes() 
{
    try 
    {
        const { data: quizzes, error } = await _supabase.from('quizzes').select('*');
        if (error) throw error;
        const quizList = document.getElementById('quiz-list');
        statusMsg.innerText = `Welcome, ${currentUserName}!`;
        quizList.innerHTML = quizzes.map(quiz => `
            <div class="quiz-card">
                <h3>${quiz.title}</h3>
                <button onclick="startQuiz('${quiz.id}')">Start Test</button>
            </div>
        `).join('');
    } 
    catch (err) 
    {
        statusMsg.innerText = "Error loading quizzes";
        console.error(err);
    }
}

async function startQuiz(quizId) 
{
    statusMsg.innerText = "Loading questions...";
    const { data: questions, error } = await _supabase
        .from('questions')
        .select(`id, question_text, options(id, option_text)`)
        .eq('quiz_id', quizId);
    if (error) return alert("Error loading quiz");
    renderQuiz(questions, quizId);
}

function renderQuiz(questions, quizId) 
{
    startTimer(300, quizId); // 5 mins
    mainContent.innerHTML = `
        <div class="quiz-container">
            <div id="timer-display" style="text-align:right; font-weight:bold; color:red; font-size: 1.2rem; margin-bottom: 10px;">Time: 05:00</div>
            ${questions.map((q, i) => `
                <div class="question-block" data-qid="${q.id}" style="margin-bottom: 20px; padding: 15px; border-bottom: 1px solid #eee;">
                    <p><strong>Q${i+1}:</strong> ${q.question_text}</p>
                    ${q.options.map(opt => `
                        <label class="option-label" style="display:block; margin: 5px 0; cursor: pointer;">
                            <input type="radio" name="q_${q.id}" value="${opt.id}"> ${opt.option_text}
                        </label>
                    `).join('')}
                </div>
            `).join('')}
            <button onclick="calculateAndSubmit('${quizId}')" style="width: 100%; margin-top: 20px;">Submit Quiz</button>
        </div>
    `;
}

function startTimer(duration, quizId) 
{
    let timer = duration, minutes, seconds;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => 
        {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        const display = document.getElementById('timer-display');
        if (display) display.textContent = "Time: " + minutes + ":" + seconds;

        if (--timer < 0) 
        {
            clearInterval(timerInterval);
            alert("Time is up!");
            calculateAndSubmit(quizId);
        }
    }, 1000);
}

async function calculateAndSubmit(quizId) 
{
    clearInterval(timerInterval);
    statusMsg.innerText = "Submitting...";
    const blocks = document.querySelectorAll('.question-block');
    let correct = 0;

    for (let block of blocks) 
    {
        const selected = block.querySelector('input:checked');
        if (selected) {
            const { data } = await _supabase
                .from('options')
                .select('is_correct')
                .eq('id', selected.value)
                .single();
            if (data?.is_correct) correct++;
        }
    }

    const score = Math.round((correct / blocks.length) * 100);
    
    await _supabase.from('results').insert([{
        user_name: currentUserName,
        quiz_id: quizId,
        score: score,
        correct_count: correct,
        total_questions: blocks.length
    }]);

    showResults({ score, correct, total: blocks.length });
}

function showResults(result) 
{
    mainContent.innerHTML = `
        <div class="score-card">
            <h2>Great job, ${currentUserName}!</h2>
            <div class="score-circle">
                <span class="score-label">Score</span>
                ${result.score}
            </div>
            <p>Accuracy: <strong>${result.correct} / ${result.total}</strong></p>
            <button onclick="location.reload()" class="btn-restart">Try Another Quiz</button>
        </div>
    `;
}

async function loadQuizzes() 
{
    try 
    {
        const { data: quizzes, error } = await _supabase.from('quizzes').select('*');
        if (error) throw error;

        const quizList = document.getElementById('quiz-list');
        statusMsg.innerText = `Welcome, ${currentUserName}!`;

        quizList.innerHTML = quizzes.map(quiz => `
            <div class="quiz-card">
                <h3>${quiz.title}</h3>
                <p class="quiz-desc">${quiz.description || "Test your knowledge in this category!"}</p>
                <button onclick="startQuiz('${quiz.id}')">Start Test</button>
            </div>
        `).join('');
    } catch (err) 
    {
        statusMsg.innerText = "Error loading quizzes. Check your connection.";
        console.error(err);
    }
}