/* ================= CONFIGURATION & DATA ================= */
// (Mantenha moneyLadder, hostImages, suspenseVoices e questionPool iguais ao anterior)
const moneyLadder = [100, 200, 500, 1000, 2000, 5000, 10000, 50000, 300000, 1000000];

// Exemplo de perguntas (Mantenha sua lista grande aqui)
const questionPool = [
    { q: "Quel est le symbole du Fer ?", opts: ["Fe", "Fr", "F", "Ir"], a: 0 },
    { q: "Dans PV=nRT, que vaut R ?", opts: ["8.314", "9.81", "3.14", "1.618"], a: 0 },
    // ... adicione suas perguntas
];

const hostImages = {
    normal: "host_normal.png",
    suspense: "host_suspense.png",
    win: "host_happy.png",
    lose: "host_sad.png"
};
const suspenseVoices = ["voice_sure_1.mp3", "voice_sure_2.mp3", "voice_sure_3.mp3", "voice_sure_4.mp3", "voice_sure_5.mp3"];

/* ================= STATE ================= */
let gameQuestions = [];
let currentLevel = 0;
let selectedAnswerIndex = null;
let isLocked = false;

// Estado dos Jokers
let jokers = {
    elimination: { used: false },
    skip: { used: false }
};

let currentRouletteType = null; // 'elimination' ou 'skip'

/* ================= DOM ELEMENTS ================= */
// (Elementos anteriores...)
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const endScreen = document.getElementById('end-screen');
const answersContainer = document.getElementById('answers-container');
const confirmBox = document.getElementById('confirm-box');
const hostImg = document.getElementById('host-img');
const questionText = document.getElementById('question-text');
const questionValue = document.getElementById('question-value');
const currentGainDisplay = document.getElementById('current-gain');
const qNumDisplay = document.getElementById('q-num');

// Novos elementos da Roleta
const rouletteModal = document.getElementById('roulette-modal');
const wheelElement = document.getElementById('the-wheel');
const btnSpin = document.getElementById('btn-spin');
const btnCloseModal = document.getElementById('btn-close-modal');
const rouletteResultText = document.getElementById('roulette-result-text');
const btnJokerElim = document.getElementById('btn-joker-elim');
const btnJokerSkip = document.getElementById('btn-joker-skip');

/* ================= AUDIO FUNCTIONS ================= */
function playRandomSuspenseVoice() {
    const randomIndex = Math.floor(Math.random() * suspenseVoices.length);
    new Audio(suspenseVoices[randomIndex]).play().catch(e=>{});
}
function playSFX(id) {
    const audio = document.getElementById(id);
    if(audio && audio.src) { audio.currentTime = 0; audio.play().catch(e=>{}); }
}

/* ================= GAME LOGIC ================= */

function startGame() {
    // Pega 10 perguntas aleatórias
    gameQuestions = [...questionPool].sort(() => 0.5 - Math.random()).slice(0, 10);
    currentLevel = 0;
    
    // Reseta Jokers
    jokers.elimination.used = false;
    jokers.skip.used = false;
    btnJokerElim.disabled = false;
    btnJokerSkip.disabled = false;
    
    startScreen.classList.remove('active');
    endScreen.classList.remove('active');
    gameScreen.classList.add('active');
    
    playSFX('sfx-background');
    loadQuestion();
}

function loadQuestion() {
    const qData = gameQuestions[currentLevel];
    
    questionText.innerText = qData.q;
    questionValue.innerText = formatMoney(moneyLadder[currentLevel]);
    currentGainDisplay.innerText = currentLevel === 0 ? "0 €" : formatMoney(moneyLadder[currentLevel - 1]);
    qNumDisplay.innerText = currentLevel + 1;
    
    hostImg.src = hostImages.normal;
    confirmBox.classList.add('hidden');
    selectedAnswerIndex = null;
    isLocked = false;

    // Gerar botões
    answersContainer.innerHTML = '';
    qData.opts.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.classList.add('answer-btn');
        btn.id = `btn-opt-${index}`; // ID para manipular eliminação
        btn.innerHTML = `<span style="color:#FFD700; margin-right:10px;">${String.fromCharCode(65+index)}:</span> ${opt}`;
        btn.onclick = () => selectOption(index, btn);
        answersContainer.appendChild(btn);
    });
}

function selectOption(index, btnElement) {
    if (isLocked) return;
    
    // Se o botão estiver desativado pelo Joker, ignora
    if(btnElement.classList.contains('disabled')) return;

    document.querySelectorAll('.answer-btn').forEach(b => b.classList.remove('selected'));
    btnElement.classList.add('selected');
    selectedAnswerIndex = index;

    hostImg.src = hostImages.suspense;
    playRandomSuspenseVoice();
    playSFX('sfx-click');
    confirmBox.classList.remove('hidden');
}

function confirmFinalAnswer() {
    if (selectedAnswerIndex === null || isLocked) return;
    isLocked = true;
    confirmBox.classList.add('hidden');

    const qData = gameQuestions[currentLevel];
    const selectedBtn = document.getElementById(`btn-opt-${selectedAnswerIndex}`);

    setTimeout(() => {
        if (selectedAnswerIndex === qData.a) {
            // WIN
            selectedBtn.classList.remove('selected');
            selectedBtn.classList.add('correct');
            hostImg.src = hostImages.win;
            playSFX('sfx-win');
            
            setTimeout(() => {
                currentLevel++;
                if (currentLevel < 10) loadQuestion();
                else gameWon();
            }, 3000);
        } else {
            // LOSE
            selectedBtn.classList.remove('selected');
            selectedBtn.classList.add('wrong');
            document.getElementById(`btn-opt-${qData.a}`).classList.add('correct');
            hostImg.src = hostImages.lose;
            playSFX('sfx-lose');
            setTimeout(gameOver, 4000);
        }
    }, 1500);
}

/* ================= ROULETTE / JOKER LOGIC ================= */

function openRoulette(type) {
    if (isLocked) return; // Não pode usar joker se já confirmou
    if (jokers[type].used) return;

    currentRouletteType = type;
    rouletteModal.classList.remove('hidden');
    
    // Reset visual do modal
    wheelElement.style.transform = 'rotate(0deg)';
    btnSpin.classList.remove('hidden');
    btnCloseModal.classList.add('hidden');
    rouletteResultText.innerText = "Tournez la roue...";
    
    // Título do Modal
    const title = document.getElementById('roulette-title');
    title.innerText = type === 'elimination' ? "ROULETTE D'ÉLIMINATION" : "ROULETTE DE SAUT";
}

function spinTheWheel() {
    btnSpin.classList.add('hidden'); // Esconde botão para não clicar 2x
    
    // 1. Calcular o Resultado com base nas probabilidades
    let resultValue = 0;
    let rotationDegrees = 0;
    
    // Geração de número aleatório (0 a 100)
    const chance = Math.random() * 100;

    if (currentRouletteType === 'elimination') {
        // PROBABILIDADES ELIMINAÇÃO (0, 1, 2, 3)
        // 0: 45%, 1: 30%, 2: 20%, 3: 5% (ajuste conforme quiser)
        if (chance < 45) resultValue = 0;
        else if (chance < 75) resultValue = 1;
        else if (chance < 95) resultValue = 2;
        else resultValue = 3;

    } else {
        // PROBABILIDADES SAUT (0, 1, 2)
        // 2 (pular 2): < 1% (Quase nula)
        // 1 (pular 1): 25%
        // 0 (pular 0): Resto (~74%)
        if (chance < 1) resultValue = 2;
        else if (chance < 26) resultValue = 1;
        else resultValue = 0;
    }

    // 2. Animação Visual
    // Girar pelo menos 5 vezes (1800deg) + um valor aleatório para efeito
    const extraSpins = 1800; 
    const randomVisual = Math.floor(Math.random() * 360);
    rotationDegrees = extraSpins + randomVisual;
    
    wheelElement.style.transform = `rotate(${rotationDegrees}deg)`;
    playSFX('sfx-click'); // Pode usar um som de roleta girando aqui se tiver

    // 3. Mostrar Resultado após 3s
    setTimeout(() => {
        applyRouletteResult(resultValue);
    }, 3000);
}

function applyRouletteResult(value) {
    let msg = "";
    
    if (currentRouletteType === 'elimination') {
        // Marcar joker como usado
        jokers.elimination.used = true;
        btnJokerElim.disabled = true;

        msg = `Résultat : ${value} réponse(s) fausse(s) retirée(s) !`;
        if (value === 0) msg += " Pas de chance !";
        else if (value === 3) msg += " INCROYABLE !";

        // Lógica de eliminação
        eliminateAnswers(value);

    } else {
        // SKIP
        jokers.skip.used = true;
        btnJokerSkip.disabled = true;

        msg = `Résultat : Vous sautez ${value} question(s) !`;
        if (value === 0) msg += " Dommage...";
        if (value === 2) msg += " JACKPOT !";

        // Salva o valor para aplicar quando fechar o modal
        jokers.skip.valueToSkip = value;
    }

    rouletteResultText.innerText = msg;
    btnCloseModal.classList.remove('hidden');
}

function closeModal() {
    rouletteModal.classList.add('hidden');

    // Se for SKIP, a ação acontece agora ao fechar
    if (currentRouletteType === 'skip') {
        const jump = jokers.skip.valueToSkip;
        if (jump > 0) {
            currentLevel += jump;
            if (currentLevel >= 10) {
                gameWon();
            } else {
                loadQuestion();
            }
        }
    }
}

// Função auxiliar para eliminar respostas erradas
function eliminateAnswers(count) {
    if (count === 0) return;

    const qData = gameQuestions[currentLevel];
    const correctIndex = qData.a;
    
    // Pega todos os índices (0, 1, 2, 3)
    let indexes = [0, 1, 2, 3];
    // Remove o índice da resposta certa
    indexes = indexes.filter(i => i !== correctIndex);
    
    // Embaralha os índices errados
    indexes.sort(() => Math.random() - 0.5);
    
    // Pega os N primeiros para eliminar
    const toEliminate = indexes.slice(0, count);

    // Aplica o estilo visual de desativado
    toEliminate.forEach(idx => {
        const btn = document.getElementById(`btn-opt-${idx}`);
        btn.classList.add('disabled');
        btn.style.opacity = "0.2";
        btn.innerText = ""; // Apaga o texto ou deixa invisível
        btn.disabled = true; // Impede clique
    });
}

// (Mantenha gameOver, gameWon e formatMoney iguais ao anterior)
function gameOver() {
    gameScreen.classList.remove('active');
    endScreen.classList.add('active');
    document.getElementById('end-title').innerText = "ÉLIMINÉ !";
    document.getElementById('end-host-img').src = hostImages.lose;
    let finalWin = currentLevel > 0 ? moneyLadder[currentLevel - 1] : 0;
    document.getElementById('final-money').innerText = formatMoney(finalWin);
}

function gameWon() {
    gameScreen.classList.remove('active');
    endScreen.classList.add('active');
    document.getElementById('end-title').innerText = "MILLIONNAIRE !";
    document.getElementById('end-host-img').src = hostImages.win;
    document.getElementById('final-money').innerText = "1 000 000 €";
}

function formatMoney(amount) {
    return amount.toLocaleString('fr-FR') + " €";
}