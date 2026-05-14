import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, Play, Pause, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

// 遊戲常數
const GRID_SIZE = 20;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];
const INITIAL_DIRECTION = 'RIGHT';
const DEFAULT_SPEED = 100; // 毫秒

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const SnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [nextDirection, setNextDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  
  const lastUpdateTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(null);

  // 生成食物
  const generateFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * (CANVAS_WIDTH / GRID_SIZE)),
        y: Math.floor(Math.random() * (CANVAS_HEIGHT / GRID_SIZE)),
      };
      // 確保食物不會生在蛇身上
      const onSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!onSnake) break;
    }
    return newFood;
  }, []);

  // 重置遊戲
  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setNextDirection(INITIAL_DIRECTION);
    setFood(generateFood(INITIAL_SNAKE));
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    lastUpdateTimeRef.current = 0;
  };

  // 處理按鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          if (direction !== 'DOWN') setNextDirection('UP');
          break;
        case 'ArrowDown':
          if (direction !== 'UP') setNextDirection('DOWN');
          break;
        case 'ArrowLeft':
          if (direction !== 'RIGHT') setNextDirection('LEFT');
          break;
        case 'ArrowRight':
          if (direction !== 'LEFT') setNextDirection('RIGHT');
          break;
        case ' ': // 空白鍵暫停/開始
          if (gameOver) {
            resetGame();
          } else {
            setIsPaused(prev => !prev);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, gameOver]);

  // 遊戲邏輯更新
  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = { ...head };

      // 更新方向（防止在一幀內快速按兩次鍵導致回頭）
      setDirection(nextDirection);
      
      switch (nextDirection) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      // 檢查碰撞牆壁
      if (
        newHead.x < 0 || 
        newHead.x >= CANVAS_WIDTH / GRID_SIZE || 
        newHead.y < 0 || 
        newHead.y >= CANVAS_HEIGHT / GRID_SIZE
      ) {
        setGameOver(true);
        setIsPaused(true);
        return prevSnake;
      }

      // 檢查碰撞自己
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true);
        setIsPaused(true);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // 檢查吃到食物
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [nextDirection, food, generateFood]);

  // 繪製畫面
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    // 背景
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 網格線 (選用，增加科技感)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
    }
    ctx.stroke();

    // 繪製食物 (霓虹紅)
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff3e3e';
    ctx.fillStyle = '#ff3e3e';
    ctx.beginPath();
    ctx.arc(
      food.x * GRID_SIZE + GRID_SIZE / 2,
      food.y * GRID_SIZE + GRID_SIZE / 2,
      GRID_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // 繪製蛇 (霓虹綠)
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ff00';
    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#00ff00' : '#00cc00';
      const margin = 1;
      ctx.fillRect(
        segment.x * GRID_SIZE + margin,
        segment.y * GRID_SIZE + margin,
        GRID_SIZE - margin * 2,
        GRID_SIZE - margin * 2
      );
      
      // 蛇頭眼睛
      if (index === 0) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        const eyeSize = 3;
        const offset = 5;
        if (direction === 'RIGHT' || direction === 'LEFT') {
          ctx.fillRect(segment.x * GRID_SIZE + (direction === 'RIGHT' ? 12 : 5), segment.y * GRID_SIZE + 5, eyeSize, eyeSize);
          ctx.fillRect(segment.x * GRID_SIZE + (direction === 'RIGHT' ? 12 : 5), segment.y * GRID_SIZE + 12, eyeSize, eyeSize);
        } else {
          ctx.fillRect(segment.x * GRID_SIZE + 5, segment.y * GRID_SIZE + (direction === 'DOWN' ? 12 : 5), eyeSize, eyeSize);
          ctx.fillRect(segment.x * GRID_SIZE + 12, segment.y * GRID_SIZE + (direction === 'DOWN' ? 12 : 5), eyeSize, eyeSize);
        }
        ctx.shadowBlur = 10; // 恢復
      }
    });

    ctx.shadowBlur = 0;
  }, [snake, food, direction]);

  // 遊戲迴圈
  const animate = useCallback((time: number) => {
    if (isPaused || gameOver) return;

    if (!lastUpdateTimeRef.current) lastUpdateTimeRef.current = time;
    const deltaTime = time - lastUpdateTimeRef.current;

    if (deltaTime > DEFAULT_SPEED - Math.min(score / 5, 50)) { // 隨著分數增加而加速
      moveSnake();
      lastUpdateTimeRef.current = time;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx);
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [isPaused, gameOver, moveSnake, draw, score]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  // 初始繪製
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx);
    }
  }, [draw]);

  // 更新最高分
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
    }
  }, [score, highScore]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white p-4 font-mono">
      {/* 頂部資訊欄 */}
      <div className="w-full max-w-[800px] flex items-center justify-between mb-4 bg-[#111] p-4 rounded-xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">目前得分</span>
            <span className="text-2xl font-bold text-[#00ff00] tabular-nums leading-none">
              {score.toString().padStart(4, '0')}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">最高紀錄</span>
            <div className="flex items-center gap-2 text-zinc-300">
              <Trophy size={16} className="text-yellow-500" />
              <span className="text-xl tabular-nums leading-none">{highScore.toString().padStart(4, '0')}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPaused(p => !p)}
            disabled={gameOver}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5 disabled:opacity-30"
          >
            {isPaused ? <Play size={20} /> : <Pause size={20} />}
          </button>
          <button
            onClick={resetGame}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      {/* 遊戲畫布區域 */}
      <div className="relative group w-full max-w-[800px] aspect-[4/3]">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full rounded-xl border border-white/20 shadow-[0_0_50px_rgba(0,255,0,0.05)] cursor-none"
        />

        {/* 暫停/引導畫面 */}
        <AnimatePresence>
          {isPaused && !gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl"
            >
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="mb-6 inline-block"
                >
                  <Play size={64} fill="#00ff00" className="text-[#00ff00]" />
                </motion.div>
                <h2 className="text-4xl font-bold mb-2 uppercase tracking-tighter">準備好了嗎？</h2>
                <p className="text-zinc-400 mb-8">按「空白鍵」或點擊「播放」按鈕開始</p>
                <div className="flex justify-center gap-4 text-xs text-zinc-500 uppercase tracking-[0.2em]">
                  <span className="flex items-center gap-1"><ChevronUp size={14} /> 方向鍵鍵控制移動</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* 遊戲結束畫面 */}
          {gameOver && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 flex items-center justify-center bg-red-950/40 backdrop-blur-md rounded-xl border-4 border-red-500/30"
            >
              <div className="text-center p-12 bg-black/80 rounded-3xl border border-red-500/50 shadow-[0_0_100px_rgba(239,68,68,0.3)]">
                <h2 className="text-6xl font-black text-red-500 mb-4 uppercase tracking-tighter italic">遊戲結束</h2>
                <div className="mb-8">
                  <p className="text-zinc-400 text-sm mb-1 uppercase tracking-widest">最終得分</p>
                  <p className="text-5xl font-bold text-white">{score}</p>
                </div>
                <button
                  onClick={resetGame}
                  className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold uppercase tracking-widest flex items-center gap-2 mx-auto transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-500/20"
                >
                  <RotateCcw size={20} />
                  再試一次
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部提示 */}
      <p className="mt-6 text-zinc-600 text-[10px] uppercase tracking-[0.4em] flex items-center gap-8">
        <span>使用方向鍵移動</span>
        <span className="w-1 h-1 bg-zinc-800 rounded-full" />
        <span>空白鍵暫停 / 繼續</span>
        <span className="w-1 h-1 bg-zinc-800 rounded-full" />
        <span>霓虹街機模式</span>
      </p>
    </div>
  );
};

export default SnakeGame;
