import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProfileSelect from './ProfileSelect';
import Quiz from './Quiz';
import Stats from './Stats';
import ProfileEdit from './ProfileEdit';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProfileSelect />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/edit-profile" element={<ProfileEdit />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
