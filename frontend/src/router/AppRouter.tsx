import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'

import HomeRoomPage from '@/pages/HomeRoomPage'
import StudyRoomPage from '@/pages/StudyRoomPage'
import StudyWithOthersPage from '@/pages/StudyWithOthersPage'

import TasksPage from '@/pages/TasksPage'
import DailyGoalsPage from '@/pages/DailyGoalsPage'
import FlashcardsPage from '@/pages/FlashcardsPage'

import ShopPage from '@/pages/ShopPage'
import ProfilePage from '@/pages/ProfilePage'

import CommunityDiscoverPage from '@/pages/CommunityDiscoverPage'
import CommunityRoomPage from '@/pages/CommunityRoomPage'
import PostDetailPage from '@/pages/PostDetailPage'
import BlogPostPage from '@/pages/BlogPostPage'
import BlogComposerPage from '@/pages/BlogComposerPage'
import ModerationQueuePage from '@/pages/ModerationQueuePage'

import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/layouts/AppLayout'


function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>

                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />

                <Route path="/login" element={<LoginPage />} />

                <Route path="/register" element={<RegisterPage />} />


                {/* Protected Application Routes */}
                <Route
                    element={
                        <ProtectedRoute>
                            <AppLayout />
                        </ProtectedRoute>
                    }
                >

                    {/* Main Rooms */}
                    <Route
                        path="/home"
                        element={<HomeRoomPage />}
                    />


                    <Route
                        path="/study-room"
                        element={<StudyRoomPage />}
                    />


                    <Route
                        path="/study-with-others"
                        element={<StudyWithOthersPage />}
                    />


                    {/* Productivity */}
                    <Route
                        path="/tasks"
                        element={<TasksPage />}
                    />


                    <Route
                        path="/daily-goals"
                        element={<DailyGoalsPage />}
                    />


                    <Route
                        path="/flashcards"
                        element={<FlashcardsPage />}
                    />



                    {/* Community */}
                    <Route
                        path="/community"
                        element={<CommunityDiscoverPage />}
                    />


                    <Route
                        path="/community/:slug"
                        element={<CommunityRoomPage />}
                    />


                    <Route
                        path="/community/:slug/reports"
                        element={<ModerationQueuePage />}
                    />


                    <Route
                        path="/community/:slug/posts/:postId"
                        element={<PostDetailPage />}
                    />


                    {/* Blog */}
                    <Route
                        path="/community/:slug/blog/new"
                        element={<BlogComposerPage />}
                    />


                    <Route
                        path="/community/:slug/blog/:blogId/edit"
                        element={<BlogComposerPage />}
                    />


                    <Route
                        path="/community/:slug/blog/:blogId"
                        element={<BlogPostPage />}
                    />



                    {/* Other Pages */}
                    <Route
                        path="/shop"
                        element={<ShopPage />}
                    />


                    <Route
                        path="/profile"
                        element={<ProfilePage />}
                    />

                </Route>



                {/* Backward compatibility */}
                <Route
                    path="/dashboard"
                    element={
                        <Navigate
                            to="/home"
                            replace
                        />
                    }
                />



                {/* Unknown route fallback */}
                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/home"
                            replace
                        />
                    }
                />

            </Routes>
        </BrowserRouter>
    )
}


export default AppRouter