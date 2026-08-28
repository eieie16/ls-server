-- Supabase 数据库初始化 SQL

-- 创建 profiles 表
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    banned BOOLEAN DEFAULT FALSE,
    play_time INTEGER DEFAULT 0,
    jobs INTEGER DEFAULT 0,
    cars INTEGER DEFAULT 0,
    avatar_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 已有表添加 avatar_url 字段（如果不存在）
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 启用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
    ON public.profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 创建函数自动同步新用户
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'username', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 创建函数处理 Google 登录时保存用户名
CREATE OR REPLACE FUNCTION public.handle_google_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 兑换码表
CREATE TABLE IF NOT EXISTS public.redemption_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    prize TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.redemption_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage redemption codes"
    ON public.redemption_codes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

CREATE POLICY "Anyone can read redemption codes"
    ON public.redemption_codes FOR SELECT
    USING (true);

-- 全站聊天表
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    username TEXT NOT NULL,
    avatar_url TEXT DEFAULT '',
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read chat" ON public.chat_messages FOR SELECT USING (true);

CREATE POLICY "Logged in users can insert chat" ON public.chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);
