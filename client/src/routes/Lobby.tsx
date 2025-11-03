import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const randomGameId = () =>
  Math.random().toString(36).slice(2, 8);

export const Lobby = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [gameId, setGameId] = useState('');

  useEffect(() => {
    const storedName = window.localStorage.getItem('playerName');
    if (storedName) {
      setName(storedName);
    }
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name || !gameId) {
      return;
    }
    window.localStorage.setItem('playerName', name);
    navigate(`/game/${gameId}?name=${encodeURIComponent(name)}`);
  };

  const handleCreate = () => {
    const newId = randomGameId();
    window.localStorage.setItem('playerName', name);
    navigate(`/game/${newId}?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-emerald-300">
          Schach Hoch 2
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Enter a room code to join, or create a new duel-enabled chess game.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Display name
            </label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ada"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Game code
            </label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-emerald-400 focus:outline-none"
              value={gameId}
              onChange={(event) => setGameId(event.target.value)}
              placeholder="Enter or paste game ID"
              required
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <button
              type="submit"
              className="flex-1 rounded-md bg-emerald-600 py-2 text-center font-semibold text-slate-900 hover:bg-emerald-500"
              disabled={!name || !gameId}
            >
              Join Game
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="rounded-md border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10"
              disabled={!name}
            >
              Create New
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
