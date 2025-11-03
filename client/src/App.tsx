import { Navigate, Route, Routes } from 'react-router-dom';
import { Lobby } from './routes/Lobby';
import { Game } from './routes/Game';

export const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Lobby />} />
      <Route path="/game/:gameId" element={<Game />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;
