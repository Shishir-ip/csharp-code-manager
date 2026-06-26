# C# Lab Manager

A modern dark-themed file manager for C# class practices and lab tasks.

## Features
- Dark theme (VS Code inspired)
- File manager with grid/list views
- Syntax highlighted C# code viewer
- Copy code button
- Simulation Mode (pre-defined output, no API)
- Real Execution via OnlineCompiler.io
- Nested folders
- Responsive design

## Setup
1. Run `supabase-setup.sql` in Supabase SQL Editor
2. Add env vars to Vercel (Supabase + optional OnlineCompiler.io)
3. Deploy

## Env Vars
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ONLINE_COMPILER_API_KEY` (optional, for real execution)