/**
 * quiz.js — Quiz mode controller.
 *
 * Supports two question types:
 *   mcq      — four option buttons
 *   tap-part — student taps the correct mesh on the 3D model
 *
 * Questions are filtered by level, shuffled, and limited to 7 per round.
 * Score saved to localStorage.
 */

import { filterQuiz, filterParts, findPartByMesh } from '../data/content.js';
import { saveQuizScore } from '../store/progress.js';
import { t } from '../i18n/t.js';

const MAX_QUESTIONS = 7;

export class QuizMode {
  constructor(ctx) {
    this.ctx = ctx;
    this._questions = [];
    this._idx = 0;
    this._score = 0;
    this._answered = false;
    this._downPos = null;
    this._onPointerDown = (e) => { this._downPos = { x: e.clientX, y: e.clientY }; };
    this._onPointerUp = this._onPointerUp.bind(this);
  }

  activate() {
    const { quizUi, topicData, levelFn } = this.ctx;
    if (!quizUi) return;

    // Filter and shuffle
    const pool = filterQuiz(topicData.quiz, levelFn());
    this._questions = shuffle(pool).slice(0, MAX_QUESTIONS);
    this._idx = 0;
    this._score = 0;
    this._answered = false;

    quizUi.hidden = false;
    this._showQuestion();
  }

  deactivate() {
    const { quizUi, highlighter, requestRender } = this.ctx;
    if (quizUi) quizUi.hidden = true;
    highlighter.restore();
    this.ctx.picker.canvas.removeEventListener('pointerdown', this._onPointerDown);
    this.ctx.picker.canvas.removeEventListener('pointerup', this._onPointerUp);
    requestRender();
  }

  _showQuestion() {
    const { quizUi, topicData } = this.ctx;
    const q = this._questions[this._idx];
    if (!q) { this._showFinal(); return; }

    this._answered = false;
    this.ctx.highlighter.restore();
    this.ctx.requestRender();

    // Update progress bar
    const pct = (this._idx / this._questions.length) * 100;
    quizUi.querySelector('#quiz-prog-bar').style.width = pct + '%';

    quizUi.querySelector('#quiz-question').textContent = this.ctx.tl(q.question);
    quizUi.querySelector('#quiz-feedback').hidden = true;
    quizUi.querySelector('#quiz-card').hidden = false;
    quizUi.querySelector('#quiz-final').hidden = true;

    const optionsEl = quizUi.querySelector('#quiz-options');
    const tapHint = quizUi.querySelector('#quiz-tap-hint');
    optionsEl.innerHTML = '';
    tapHint.hidden = true;

    if (q.type === 'mcq') {
      tapHint.hidden = true;
      optionsEl.hidden = false;
      for (let i = 0; i < q.options.length; i++) {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = this.ctx.tl(q.options[i]);
        btn.addEventListener('click', () => this._answerMcq(i, q));
        optionsEl.appendChild(btn);
      }
    } else if (q.type === 'tap-part') {
      optionsEl.hidden = true;
      tapHint.hidden = false;
      this.ctx.picker.canvas.addEventListener('pointerdown', this._onPointerDown);
      this.ctx.picker.canvas.addEventListener('pointerup', this._onPointerUp);
    }
  }

  _onPointerUp(event) {
    if (this._answered) return;
    if (this._downPos) {
      const dx = event.clientX - this._downPos.x;
      const dy = event.clientY - this._downPos.y;
      if (Math.hypot(dx, dy) > 6) return;
    }
    const q = this._questions[this._idx];
    if (!q || q.type !== 'tap-part') return;

    const hit = this.ctx.picker.pick(event);
    if (!hit) return;

    const part = findPartByMesh(hit.meshName, this.ctx.topicData.parts, this.ctx.levelFn());
    if (!part) return;

    const isCorrect = part.id === q.answer;
    this._handleAnswer(isCorrect, q, hit, part);
  }

  _answerMcq(idx, q) {
    if (this._answered) return;
    const isCorrect = idx === q.answer;

    // Colour the options
    const btns = this.ctx.quizUi.querySelectorAll('.quiz-option');
    btns.forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.answer) btn.classList.add('correct');
      else if (i === idx && !isCorrect) btn.classList.add('wrong');
    });

    this._handleAnswer(isCorrect, q);
  }

  _handleAnswer(isCorrect, q, hit, hitPart) {
    this._answered = true;
    if (isCorrect) this._score++;

    // For tap-part, highlight the tapped mesh
    if (q.type === 'tap-part' && hit) {
      const { allMeshes, topicData, levelFn } = this.ctx;
      const correctPart = filterParts(topicData.parts, levelFn()).find(p => p.id === q.answer);
      if (correctPart) {
        const meshNames = new Set(correctPart.meshNames);
        const correctMeshes = allMeshes.filter(m => meshNames.has(m.userData.meshName ?? m.name));
        this.ctx.highlighter.select(correctMeshes, allMeshes);
        this.ctx.requestRender();
      }
      this.ctx.picker.canvas.removeEventListener('pointerup', this._onPointerUp);
    }

    // Show feedback
    const feedbackEl = this.ctx.quizUi.querySelector('#quiz-feedback');
    const iconEl = this.ctx.quizUi.querySelector('#quiz-feedback-icon');
    const explanationEl = this.ctx.quizUi.querySelector('#quiz-explanation');
    iconEl.textContent = isCorrect ? '✅' : '❌';
    explanationEl.textContent = this.ctx.tl(q.explanation);
    feedbackEl.hidden = false;

    // Wire up Next button
    const nextBtn = this.ctx.quizUi.querySelector('#quiz-next');
    const handler = () => {
      nextBtn.removeEventListener('click', handler);
      this._idx++;
      this._showQuestion();
    };
    nextBtn.addEventListener('click', handler);
  }

  _showFinal() {
    const { quizUi, topicData, levelFn } = this.ctx;
    const fraction = this._score / this._questions.length;
    saveQuizScore(topicData.id, levelFn(), fraction);

    const pct = Math.round(fraction * 100);
    const scoreStr = `${this._score} / ${this._questions.length}`;

    quizUi.querySelector('#quiz-card').hidden = true;
    quizUi.querySelector('#quiz-final').hidden = false;
    quizUi.querySelector('#quiz-score-num').textContent = scoreStr;
    quizUi.querySelector('#quiz-prog-bar').style.width = '100%';

    let msg;
    if (fraction === 1) msg = t('ui.quizPerfect');
    else if (fraction >= 0.6) msg = t('ui.quizGood');
    else msg = t('ui.quizOk');
    quizUi.querySelector('#quiz-score-msg').textContent = msg;

    // Retry button
    quizUi.querySelector('#quiz-retry').onclick = () => this.activate();

    // Back to explore button
    quizUi.querySelector('#quiz-to-explore').onclick = () => {
      // Signal the main controller to switch modes
      this.ctx.onExplore?.();
    };
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

