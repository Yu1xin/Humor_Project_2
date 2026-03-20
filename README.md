# Humor Analytics Dashboard

An analytics dashboard built with Next.js and Supabase to help evaluate which content factors drive user engagement (likes) for captions.

## Overview

This project transforms raw caption data into actionable insights for non-technical users.  
Instead of requiring SQL, R, or Stata, users can directly explore how different factors affect performance through an interactive dashboard.

## Features

### 1. Regression Analysis
- Analyze relationship between:
    - Caption length (characters / words)
    - Number of likes
- Helps identify optimal caption structure

### 2. Factor Impact Analysis
- Evaluate how different factors influence engagement:
    - Image
    - Humor flavor
    - Profile
    - Time bucket
- Uses: impact = avg(group) - avg(overall)


### 3. Leaderboard
- Rank top-performing:
- Profiles
- Images
- Humor flavors
- Supports multiple metrics:
- Average likes
- Total likes
- Caption count

### 4. Metric Toggle
- Switch between:
- `avgLikes`
- `totalLikes`
- Dynamically updates:
- Sorting
- Displayed values
- UI highlights

## 🛠 Tech Stack

- **Frontend:** Next.js (App Router)
- **Backend / DB:** Supabase
- **Language:** TypeScript
- **Styling:** Tailwind CSS

## ⚠️ Real-World Data Challenges Solved

### 1. Pagination Limit (Supabase 1000 rows)
- Implemented custom pagination (`fetchAllRows`) to retrieve full dataset

### 2. One-to-Many Join Explosion
- Joins with `llm_responses` created duplicated rows (~110k)
- Resolved by avoiding invalid regression variables

### 3. Missing / Unknown Labels
- Handled null or broken foreign keys with fallback labels: profileNameById.get(id) ?? User ${id.slice(0,8)}


### 4. Data Filtering Decisions
- Dropped unreliable variables (e.g., processing_time with low coverage)

## 🎯 Purpose

This dashboard is designed to:
- Help teams make data-driven decisions about content creation
- Identify what drives user engagement
- Provide insights without requiring technical background

## 📸 Demo

(Add screenshots here)

## 📦 Project Structure (Simplified)
app/
├── api/analytics # Data processing Calculation behind admin pages
├── components # UI components sidebar
├── admin # Admin dashboard
├── main # Main feed
├── upload # Allow users to upload images for AI processing
├── Auth # login
├── lib # profile link


## 🧠 Key Insight
This project focuses not just on visualization, but on turning messy real-world data into usable insights.