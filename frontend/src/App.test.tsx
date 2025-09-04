import { render, screen } from '@testing-library/react';
import App from './App';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

describe('App', () => {
  it('renders header', () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<App />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/Personal Library/i)).toBeInTheDocument();
  });
});
