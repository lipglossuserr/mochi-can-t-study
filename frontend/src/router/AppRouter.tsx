import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import HomeRoomPage from '@/pages/HomeRoomPage'
import StudyRoomPage from '@/pages/StudyRoomPage'
import TasksPage from '@/pages/TasksPage'
import DailyGoalsPage from '@/pages/DailyGoalsPage'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/layouts/AppLayout'
import ShopPage from '@/pages/ShopPage'
import ProfilePage from '@/pages/ProfilePage'
import CommunityDiscoverPage from '@/pages/CommunityDiscoverPage'
import CommunityRoomPage from '@/pages/CommunityRoomPage'
import PostDetailPage from '@/pages/PostDetailPage'
import BlogPostPage from '@/pages/BlogPostPage'
import BlogComposerPage from '@/pages/BlogComposerPage'
import ModerationQueuePage from '@/pages/ModerationQueuePage'
import StudyWithOthersPage from '@/pages/StudyWithOthersPage'
import FlashcardsPage from '@/pages/FlashcardsPage'

/**
 * Every authenticated room shares one layout: AppLayout renders the
 * Sidebar/BottomNavigation/GlobalPetLayer shell once, and each room
 * below only supplies its own content via <Outlet />. Adding a future
 * room (Bedroom, Kitchen, Garden, Community...) is one more <Route>
 * here, in src/config/navigation.ts, and nowhere else.
 */
function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/home" element={<HomeRoomPage />} />
          <Route path="/study-room" element={<StudyRoomPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/daily-goals" element={<DailyGoalsPage />} />
          <Route path="/flashcards" element={<FlashcardsPage />} />
          <Route path="/study-with-others" element={<StudyWithOthersPage />} />
          <Route path="/community" element={<CommunityDiscoverPage />} />
          <Route path="/community/:slug" element={<CommunityRoomPage />} />
          <Route path="/community/:slug/reports" element={<ModerationQueuePage />} />
          <Route path="/community/:slug/posts/:postId" element={<PostDetailPage />} />
          <Route path="/community/:slug/blog/new" element={<BlogComposerPage />} />
          <Route path="/community/:slug/blog/:blogId/edit" element={<BlogComposerPage />} />
          <Route path="/community/:slug/blog/:blogId" element={<BlogPostPage />} />
          <Route
              path="/shop" element={<ShopPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Sprint 4C/4D used /dashboard — keep old links and bookmarks working. */}
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
