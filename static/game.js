import { crateDB } from './cratedb.js';

// Move state definition before usage
const state = {
    curr: 0,
    getReady: 0,
    Play: 1,
    gameOver: 2,
    leaderboard: []
};

// Wait for DOM to load before adding listeners
document.addEventListener('DOMContentLoaded', () => {
    const scrn = document.getElementById("canvas");
    const sctx = scrn.getContext("2d");
    scrn.tabIndex = 1;

    // Move event listeners inside DOMContentLoaded
    scrn.addEventListener("click", () => {
        switch (state.curr) {
            case state.getReady:
                state.curr = state.Play;
                SFX.start.play();
                break;
            case state.Play:
                bird.flap();
                break;
            case state.gameOver:
                state.curr = state.getReady;
                bird.speed = 0;
                bird.y = 100;
                pipe.pipes = [];
                UI.score.curr = 0;
                SFX.played = false;
                break;
        }
    });

    // Start game loop after DOM loads
    requestAnimationFrame(gameLoop);
});

const RAD = Math.PI / 180;
const scrn = document.getElementById("canvas");
const sctx = scrn.getContext("2d");
scrn.tabIndex = 1;

let gameOverTracked = false;

scrn.addEventListener("click", () => {
  switch (state.curr) {
    case state.getReady:
      state.curr = state.Play;
      SFX.start.play();
      break;
    case state.Play:
      bird.flap();
      break;
    case state.gameOver:
      document.getElementById('leaderboardContainer').style.display = 'none';
      state.curr = state.getReady;
      bird.speed = 0;
      bird.y = 100;
      pipe.pipes = [];
      UI.score.curr = 0;
      SFX.played = false;
      gameOverTracked = false;
      break;
  }
});

scrn.onkeydown = function keyDown(e) {
  if (e.keyCode == 32 || e.keyCode == 87 || e.keyCode == 38) {
    // Space Key or W key or arrow up
    switch (state.curr) {
      case state.getReady:
        state.curr = state.Play;
        SFX.start.play();
        break;
      case state.Play:
        bird.flap();
        break;
      case state.gameOver:
        state.curr = state.getReady;
        bird.speed = 0;
        bird.y = 100;
        pipe.pipes = [];
        UI.score.curr = 0;
        SFX.played = false;
        break;
    }
  }
};

// Define the game loop function
function gameLoop() {
  // Update game state
  frames++;
  gnd.update();
  bird.update();
  pipe.update();
  ground.update();
  background.update();
  
  // Clear canvas
  sctx.fillStyle = "#70c5ce";
  sctx.fillRect(0, 0, scrn.width, scrn.height);
  
  // Draw game objects
  // bg.draw();
  background.draw();
  pipe.draw();
  gnd.draw();
  bird.draw();
  UI.draw();
  ground.draw();
  // Draw leaderboard if game over
  if (state.curr === state.gameOver) {
    leaderboard.draw();
  }
  
  requestAnimationFrame(gameLoop);
}

let frames = 0;
let dx = 2;
const SFX = {
  start: new Audio(),
  flap: new Audio(),
  score: new Audio(),
  hit: new Audio(),
  die: new Audio(),
  played: false,
  
  // Add init function to load audio files
  init() {
    this.start.src = "static/sfx/start.wav";
    this.flap.src = "static/sfx/flap.wav"; 
    this.score.src = "static/sfx/score.wav";
    this.hit.src = "static/sfx/hit.wav";
    this.die.src = "static/sfx/die.wav";
    
    // Pre-load audio files
    Object.values(this).forEach(audio => {
      if(audio instanceof Audio) {
        audio.load();
      }
    });
  }
};
const gnd = {
  sprite: new Image(),
  x: 0,
  y: 0,
  draw: function () {
    this.y = parseFloat(scrn.height - this.sprite.height);
    sctx.drawImage(this.sprite, this.x, this.y);
  },
  update: function () {
    if (state.curr != state.Play) return;
    this.x -= dx;
    this.x = this.x % (this.sprite.width / 2);
  },
};
const bg = {
  sprite: new Image(),
  x: 0,
  y: 0,
  draw: function () {
    y = parseFloat(scrn.height - this.sprite.height);
    sctx.drawImage(this.sprite, this.x, y);
  },
};
const pipe = {
  top: { sprite: new Image() },
  bot: { sprite: new Image() },
  gap: 85,
  moved: true,
  pipes: [],
  draw: function () {
    for (let i = 0; i < this.pipes.length; i++) {
      let p = this.pipes[i];
      sctx.drawImage(this.top.sprite, p.x, p.y);
      sctx.drawImage(
        this.bot.sprite,
        p.x,
        p.y + parseFloat(this.top.sprite.height) + this.gap
      );
    }
  },
  update: function () {
    if (state.curr != state.Play) return;
    if (frames % 100 == 0) {
      this.pipes.push({
        x: parseFloat(scrn.width),
        y: -210 * Math.min(Math.random() + 1, 1.8),
      });
    }
    this.pipes.forEach((pipe) => {
      pipe.x -= dx;
    });

    if (this.pipes.length && this.pipes[0].x < -this.top.sprite.width) {
      this.pipes.shift();
      this.moved = true;
    }
  },
};
const bird = {
  animations: [
    { sprite: new Image() },
    { sprite: new Image() },
    { sprite: new Image() },
    { sprite: new Image() },
  ],
  rotatation: 0,
  x: 50,
  y: 100,
  speed: 0,
  gravity: 0.125,
  thrust: 3.6,
  frame: 0,
  draw: function () {
    let h = this.animations[this.frame].sprite.height;
    let w = this.animations[this.frame].sprite.width;
    sctx.save();
    sctx.translate(this.x, this.y);
    sctx.rotate(this.rotatation * RAD);
    sctx.drawImage(this.animations[this.frame].sprite, -w / 2, -h / 2);
    sctx.restore();
  },
  update: function () {
    let r = parseFloat(this.animations[0].sprite.width) / 2;
    switch (state.curr) {
      case state.getReady:
        this.rotatation = 0;
        this.y += frames % 10 == 0 ? Math.sin(frames * RAD) : 0;
        this.frame += frames % 10 == 0 ? 1 : 0;
        break;
      case state.Play:
        this.frame += frames % 5 == 0 ? 1 : 0;
        this.y += this.speed;
        this.setRotation();
        this.speed += this.gravity;
        if (this.y + r >= gnd.y || this.collisioned()) {
          state.curr = state.gameOver;
        }

        break;
      case state.gameOver:
        this.frame = 1;
        if (this.y + r < gnd.y) {
          this.y += this.speed;
          this.setRotation();
          this.speed += this.gravity * 2;
        } else {
          this.speed = 0;
          this.y = gnd.y - r;
          this.rotatation = 90;
          if (!SFX.played) {
            SFX.die.play();
            SFX.played = true;
          }
        }

        break;
    }
    this.frame = this.frame % this.animations.length;
  },
  flap: function () {
    if (this.y > 0) {
      SFX.flap.play();
      this.speed = -this.thrust;
    }
  },
  setRotation: function () {
    if (this.speed <= 0) {
      this.rotatation = Math.max(-25, (-25 * this.speed) / (-1 * this.thrust));
    } else if (this.speed > 0) {
      this.rotatation = Math.min(90, (90 * this.speed) / (this.thrust * 2));
    }
  },
  collisioned: function () {
    if (!pipe.pipes.length) return;
    let bird = this.animations[0].sprite;
    let x = pipe.pipes[0].x;
    let y = pipe.pipes[0].y;
    let r = bird.height / 4 + bird.width / 4;
    let roof = y + parseFloat(pipe.top.sprite.height);
    let floor = roof + pipe.gap;
    let w = parseFloat(pipe.top.sprite.width);
    if (this.x + r >= x) {
      if (this.x + r < x + w) {
        if (this.y - r <= roof || this.y + r >= floor) {
          SFX.hit.play();
          return true;
        }
      } else if (pipe.moved) {
        UI.score.curr++;
        SFX.score.play();
        pipe.moved = false;
      }
    }
  },
};
const UI = {
  getReady: { sprite: new Image() },
  gameOver: { sprite: new Image() },
  tap: [{ sprite: new Image() }, { sprite: new Image() }],
  score: {
    curr: 0,
    best: 0,
  },
  x: 0,
  y: 0,
  tx: 0,
  ty: 0,
  frame: 0,
  draw: function () {
    switch (state.curr) {
      case state.getReady:
        this.y = parseFloat(scrn.height - this.getReady.sprite.height) / 2;
        this.x = parseFloat(scrn.width - this.getReady.sprite.width) / 2;
        this.tx = parseFloat(scrn.width - this.tap[0].sprite.width) / 2;
        this.ty =
          this.y + this.getReady.sprite.height - this.tap[0].sprite.height;
        sctx.drawImage(this.getReady.sprite, this.x, this.y);
        sctx.drawImage(this.tap[this.frame].sprite, this.tx, this.ty);
        break;
      case state.gameOver:
        this.y = parseFloat(scrn.height - this.gameOver.sprite.height) / 2;
        this.x = parseFloat(scrn.width - this.gameOver.sprite.width) / 2;
        this.tx = parseFloat(scrn.width - this.tap[0].sprite.width) / 2;
        this.ty =
          this.y + this.gameOver.sprite.height - this.tap[0].sprite.height;
        sctx.drawImage(this.gameOver.sprite, this.x, this.y);
        sctx.drawImage(this.tap[this.frame].sprite, this.tx, this.ty);
        break;
    }
    this.drawScore();
  },
  drawScore: function () {
    sctx.fillStyle = "#FFFFFF";
    sctx.strokeStyle = "#000000";
    switch (state.curr) {
      case state.Play:
        sctx.lineWidth = "2";
        sctx.font = "35px Squada One";
        sctx.fillText(this.score.curr, scrn.width / 2 - 5, 50);
        sctx.strokeText(this.score.curr, scrn.width / 2 - 5, 50);
        break;
      case state.gameOver:
        sctx.lineWidth = "2";
        sctx.font = "40px Squada One";
        let sc = `SCORE :     ${this.score.curr}`;
        try {
          this.score.best = Math.max(
            this.score.curr,
            localStorage.getItem("best")
          );
          localStorage.setItem("best", this.score.best);
          let bs = `BEST  :     ${this.score.best}`;
          sctx.fillText(sc, scrn.width / 2 - 80, scrn.height / 2 + 0);
          sctx.strokeText(sc, scrn.width / 2 - 80, scrn.height / 2 + 0);
          sctx.fillText(bs, scrn.width / 2 - 80, scrn.height / 2 + 30);
          sctx.strokeText(bs, scrn.width / 2 - 80, scrn.height / 2 + 30);
        } catch (e) {
          sctx.fillText(sc, scrn.width / 2 - 85, scrn.height / 2 + 15);
          sctx.strokeText(sc, scrn.width / 2 - 85, scrn.height / 2 + 15);
        }

        if (state.curr === state.gameOver && !SFX.played && !gameOverTracked) {
          trackEvent('game_over', { score: this.score.curr });
          fetch('/leaderboard')
              .then(resp => resp.json())
              .then(leaderboard => {
                  let output = '<h3>Leaderboard</h3><ul>';
                  leaderboard.forEach(entry => {
                      output += `<li>${entry.player}: ${entry.score}</li>`;
                  });
                  output += '</ul>';
                  document.getElementById('leaderboardContainer').innerHTML = output;
                  gameOverTracked = true;
              })
              .catch(err => console.error('Leaderboard fetch error:', err));
      }
        break;
    }
  },
  update: function () {
    if (state.curr == state.Play) return;
    this.frame += frames % 10 == 0 ? 1 : 0;
    this.frame = this.frame % this.tap.length;
  },
};

bird.animations[0].sprite.src = "static/img/bird/b0.png";
bird.animations[1].sprite.src = "static/img/bird/b1.png";
bird.animations[2].sprite.src = "static/img/bird/b2.png";
bird.animations[3].sprite.src = "static/img/bird/b0.png";

// Load assets before game starts
window.onload = function() {
  scrn.style.display = 'none'; // Hide canvas until form submitted
  
  // Preload all game images
  gnd.sprite.src = "static/img/ground.png";
  bg.sprite.src = "static/img/BG.png";
  pipe.top.sprite.src = "static/img/toppipe.png";
  pipe.bot.sprite.src = "static/img/botpipe.png";
  UI.getReady.sprite.src = "static/img/getready.png";
  UI.gameOver.sprite.src = "static/img/go.png";
  bird.animations[0].sprite.src = "static/img/bird/b0.png";
  bird.animations[1].sprite.src = "static/img/bird/b1.png";
  bird.animations[2].sprite.src = "static/img/bird/b2.png";
  SFX.init(); // Initialize SFX
}
const background = {
  x: 0,
  y: 0,
  width: 288,    // Width of single background image
  speed: 0.5,    // Slower than ground for parallax
  
  update() {
      this.x = (this.x - this.speed) % this.width;
  },
  
  draw() {
      // Calculate how many images needed to fill screen
      let numImages = Math.ceil(scrn.width / this.width) + 1;
      
      // Draw repeated backgrounds
      for(let i = 0; i < numImages; i++) {
          sctx.drawImage(bg.sprite,
                        this.x + (i * this.width), this.y,
                        this.width, scrn.height);
      }
  }
}

const ground = {
  x: 0,
  y: scrn.height - 112,
  width: 2400,
  speed: 2,
  
  update() {
      this.x = (this.x - this.speed) % (scrn.width/2);
  },
  
  draw() {
      // Use the ground sprite image directly instead of sprite sheet
      sctx.drawImage(gnd.sprite, 
                    this.x, this.y, this.width, 112);
      // Draw second ground piece for seamless scrolling
      sctx.drawImage(gnd.sprite,
                    this.x + this.width/2, this.y, this.width, 112);
  }
};

// Event tracking functions
async function trackEvent(type, data) {
  if (!activeSession) {
    console.warn('No active session - initializing default session');
    await initializeSession('anonymous');
  }

  try {
    const response = await fetch('/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: type,
        data: data,
        session_id: activeSession
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Event tracking failed:', errorData);
    }
  } catch (error) {
    console.error('Event tracking error:', error);
  }
}

let activeSession = null;

async function initializeSession(email) {
  try {
    const response = await fetch('/start-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: email })
    });

    if (!response.ok) {
      throw new Error('Failed to initialize session');
    }

    const data = await response.json();
    activeSession = data.session_id;
    return activeSession;
  } catch (error) {
    console.error('Session initialization failed:', error);
    return null;
  }
}


// Modify bird.collisioned function to track collisions
const originalCollisioned = bird.collisioned;
bird.collisioned = function() {
    const collision = originalCollisioned.call(this);
    if (collision) {
        trackEvent('collision', {
            type: 'pipe'
        });
    }
    return collision;
};

// Modify UI.drawScore to show leaderboard container when displaying it
const originalDrawScore = UI.drawScore;
UI.drawScore = function() {
    const oldScore = this.score.curr;
    originalDrawScore.call(this);
    if (state.curr === state.Play && this.score.curr !== oldScore) {
        trackEvent('score_update', {
            score: this.score.curr
        });
    }
    if (state.curr === state.gameOver && !SFX.played && !gameOverTracked) {
        trackEvent('game_over', {
            score: this.score.curr
        });
        fetch('/leaderboard')
            .then(resp => resp.json())
            .then(leaderboard => {
                let output = '<h3>Leaderboard</h3><ul>';
                leaderboard.forEach(entry => {
                    output += `<li>${entry.player}: ${entry.score}</li>`;
                });
                output += '</ul>';
                const leaderboardContainer = document.getElementById('leaderboardContainer');
                leaderboardContainer.innerHTML = output;
                leaderboardContainer.style.display = 'block'; // Show leaderboard
                gameOverTracked = true;
            })
            .catch(err => console.error('Leaderboard fetch error:', err));
    }
};

const leaderboard = {
    draw: async function() {
        if (state.curr !== state.gameOver) return;
        
        const scores = await crateDB.getLeaderboard(5);
        state.leaderboard = scores;
        
        // Render leaderboard
        sctx.fillStyle = "#FFF";
        sctx.strokeStyle = "#000";
        sctx.lineWidth = 2;
        sctx.font = "25px Squada One";
        
        sctx.fillText("LEADERBOARD", scrn.width/2 - 80, 200);
        sctx.strokeText("LEADERBOARD", scrn.width/2 - 80, 200);
        
        scores.forEach((score, index) => {
            const text = `${index + 1}. ${score.playerName}: ${score.score}`;
            sctx.fillText(text, scrn.width/2 - 80, 240 + (index * 30));
            sctx.strokeText(text, scrn.width/2 - 80, 240 + (index * 30));
        });
    }
};

// Update game over handling
async function gameOver() {
    state.curr = state.gameOver;
    SFX.die.play();
    
    if (bird.score.curr > 0) {
        await crateDB.saveScore('Player', bird.score.curr);
    }
}

let leaderboardData = null;

// Single fetch function
async function fetchLeaderboard() {
    if (leaderboardData) return leaderboardData;
    try {
        const scores = await crateDB.getLeaderboard(5);
        leaderboardData = scores;
        return scores;
    } catch (err) {
        console.error('Leaderboard fetch error:', err);
        return [];
    }
}

// Modified UI.drawScore
UI.drawScore = function() {
    const oldScore = this.score.curr;
    originalDrawScore.call(this);
    
    if (state.curr === state.gameOver && !gameOverTracked) {
        gameOverTracked = true;
        fetchLeaderboard().then(scores => {
            const container = document.getElementById('leaderboardContainer');
            let output = '<h3>Leaderboard</h3><ul>';
            scores.forEach(entry => {
                output += `<li>${entry.player}: ${entry.score}</li>`;
            });
            output += '</ul>';
            container.innerHTML = output;
            container.style.display = 'block';
        });
    }
};

// Modified leaderboard.draw
leaderboard.draw = function() {
    if (state.curr !== state.gameOver || !leaderboardData) return;
    
    // Just render the cached data
    sctx.fillStyle = "#FFF";
    sctx.strokeStyle = "#000";
    sctx.lineWidth = 2;
    sctx.font = "25px Squada One";
    
    sctx.fillText("LEADERBOARD", scrn.width/2 - 80, 200);
    sctx.strokeText("LEADERBOARD", scrn.width/2 - 80, 200);
    
    leaderboardData.forEach((score, index) => {
        const text = `${index + 1}. ${score.playerName}: ${score.score}`;
        sctx.fillText(text, scrn.width/2 - 80, 240 + (index * 30));
    });
};

// Game initialization function
async function startGame() {
  const email = document.getElementById('email').value || 'anonymous';
  
  // Initialize session first
  activeSession = await initializeSession(email);
  if (!activeSession) {
    console.error('Failed to initialize session');
    return;
  }
  
  // Hide form and leaderboard
  document.getElementById('emailForm').style.display = 'none';
  document.getElementById('leaderboardContainer').style.display = 'none';
  
  // Initialize audio
  SFX.init();
  
  // Initialize game state
  state.curr = state.getReady;
  bird.speed = 0;
  bird.y = 100;
  pipe.pipes = [];
  UI.score.curr = 0;
  SFX.played = false;

  // Show canvas and start game
  const scrn = document.getElementById('canvas');
  scrn.style.display = 'block';
  scrn.focus();
  frames = 0;
  gameLoop();
}

// Wait for DOM content to load
document.addEventListener('DOMContentLoaded', () => {
  // Set up form submission handler
  const emailForm = document.getElementById('emailForm');
  if (emailForm) {
      emailForm.addEventListener('submit', async (event) => {
          event.preventDefault();
          await startGame();
      });
  }

  // Initialize game canvas - no need for additional click handler
  const scrn = document.getElementById('canvas');
  if (scrn) {
      scrn.tabIndex = 1;
      scrn.focus();
  }
});

// Export game functions
export { gameLoop, gameOver, startGame };
