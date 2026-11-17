import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Placeholder from './pages/Placeholder'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/dashboard"
          element={
            <Placeholder
              title="Dashboard"
              description="Live metrics and queue counters, computed from the database in real time. Built in Phase 5."
            />
          }
        />
        <Route
          path="/verification"
          element={
            <Placeholder
              title="Verification Queue"
              description="The opportunity lifecycle — eight states, six criteria, and the two-step publish gate enforced in the database. Built in Phase 2."
            />
          }
        />
        <Route
          path="/matching"
          element={
            <Placeholder
              title="Mentor Matching"
              description="Mentor and mentee profiles, weighted six-criteria scoring, and the accept / decline / confirm flow. Built in Phase 4."
            />
          }
        />
        <Route
          path="/opportunities"
          element={
            <Placeholder
              title="Opportunities"
              description="The student-facing listing of published opportunities, with search and filtering. Built in Phase 3."
            />
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
