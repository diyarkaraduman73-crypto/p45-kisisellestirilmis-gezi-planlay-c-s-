-- OTOMATİK ÜRETİLDİ: migration'lar uygulandıktan sonra pg_dump --schema-only çıktısı.
-- Şemayı değiştirmek için bu dosyayı değil, db/migrations/ altına yeni bir dosya ekleyin.

--
-- PostgreSQL database dump
--

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

--
-- Name: cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cities (
    id integer NOT NULL,
    name character varying(80) NOT NULL,
    country character varying(80) NOT NULL
);

--
-- Name: cities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: cities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cities_id_seq OWNED BY public.cities.id;

--
-- Name: day_plan_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.day_plan_items (
    id integer NOT NULL,
    day_plan_id integer NOT NULL,
    poi_id integer NOT NULL,
    visit_order smallint NOT NULL,
    start_time time without time zone,
    note text,
    CONSTRAINT day_plan_items_visit_order_check CHECK ((visit_order >= 1))
);

--
-- Name: day_plan_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.day_plan_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: day_plan_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.day_plan_items_id_seq OWNED BY public.day_plan_items.id;

--
-- Name: day_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.day_plans (
    id integer NOT NULL,
    trip_id integer NOT NULL,
    day_number smallint NOT NULL,
    summary text,
    CONSTRAINT day_plans_day_number_check CHECK ((day_number >= 1))
);

--
-- Name: day_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.day_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: day_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.day_plans_id_seq OWNED BY public.day_plans.id;

--
-- Name: interests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interests (
    id integer NOT NULL,
    slug character varying(30) NOT NULL,
    name character varying(60) NOT NULL
);

--
-- Name: interests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.interests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: interests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.interests_id_seq OWNED BY public.interests.id;

--
-- Name: pois; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pois (
    id integer NOT NULL,
    city_id integer NOT NULL,
    interest_id integer NOT NULL,
    name character varying(120) NOT NULL,
    description text,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    visit_minutes smallint DEFAULT 60 NOT NULL,
    price_level smallint DEFAULT 0 NOT NULL,
    CONSTRAINT pois_lat_check CHECK (((lat >= ('-90'::integer)::double precision) AND (lat <= (90)::double precision))),
    CONSTRAINT pois_lng_check CHECK (((lng >= ('-180'::integer)::double precision) AND (lng <= (180)::double precision))),
    CONSTRAINT pois_price_level_check CHECK (((price_level >= 0) AND (price_level <= 3))),
    CONSTRAINT pois_visit_minutes_check CHECK ((visit_minutes > 0))
);

--
-- Name: pois_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pois_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: pois_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pois_id_seq OWNED BY public.pois.id;

--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    name text NOT NULL,
    run_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    user_agent character varying(255),
    CONSTRAINT sessions_check CHECK ((expires_at > created_at))
);

--
-- Name: trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trips (
    id integer NOT NULL,
    user_id integer NOT NULL,
    city_id integer NOT NULL,
    title character varying(120) NOT NULL,
    start_date date,
    day_count smallint NOT NULL,
    share_code character varying(12),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT trips_day_count_check CHECK (((day_count >= 1) AND (day_count <= 14)))
);

--
-- Name: trips_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: trips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trips_id_seq OWNED BY public.trips.id;

--
-- Name: user_interests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_interests (
    user_id integer NOT NULL,
    interest_id integer NOT NULL
);

--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    user_id integer NOT NULL,
    budget character varying(10) DEFAULT 'orta'::character varying NOT NULL,
    pace character varying(10) DEFAULT 'normal'::character varying NOT NULL,
    language character varying(5) DEFAULT 'tr'::character varying NOT NULL,
    CONSTRAINT user_preferences_budget_check CHECK (((budget)::text = ANY ((ARRAY['dusuk'::character varying, 'orta'::character varying, 'yuksek'::character varying])::text[]))),
    CONSTRAINT user_preferences_pace_check CHECK (((pace)::text = ANY ((ARRAY['sakin'::character varying, 'normal'::character varying, 'yogun'::character varying])::text[])))
);

--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    full_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    role character varying(10) DEFAULT 'gezgin'::character varying NOT NULL,
    failed_login_count smallint DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    last_login_at timestamp with time zone,
    CONSTRAINT chk_users_email_format CHECK ((((email)::text = lower((email)::text)) AND ((email)::text ~~ '%_@_%._%'::text))),
    CONSTRAINT chk_users_role CHECK (((role)::text = ANY ((ARRAY['gezgin'::character varying, 'yonetici'::character varying])::text[])))
);

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

--
-- Name: cities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities ALTER COLUMN id SET DEFAULT nextval('public.cities_id_seq'::regclass);

--
-- Name: day_plan_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_plan_items ALTER COLUMN id SET DEFAULT nextval('public.day_plan_items_id_seq'::regclass);

--
-- Name: day_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_plans ALTER COLUMN id SET DEFAULT nextval('public.day_plans_id_seq'::regclass);

--
-- Name: interests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interests ALTER COLUMN id SET DEFAULT nextval('public.interests_id_seq'::regclass);

--
-- Name: pois id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pois ALTER COLUMN id SET DEFAULT nextval('public.pois_id_seq'::regclass);

--
-- Name: trips id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips ALTER COLUMN id SET DEFAULT nextval('public.trips_id_seq'::regclass);

--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

--
-- Name: cities cities_name_country_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_name_country_key UNIQUE (name, country);

--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);

--
-- Name: day_plan_items day_plan_items_day_plan_id_visit_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_plan_items
    ADD CONSTRAINT day_plan_items_day_plan_id_visit_order_key UNIQUE (day_plan_id, visit_order);

--
-- Name: day_plan_items day_plan_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_plan_items
    ADD CONSTRAINT day_plan_items_pkey PRIMARY KEY (id);

--
-- Name: day_plans day_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_plans
    ADD CONSTRAINT day_plans_pkey PRIMARY KEY (id);

--
-- Name: day_plans day_plans_trip_id_day_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_plans
    ADD CONSTRAINT day_plans_trip_id_day_number_key UNIQUE (trip_id, day_number);

--
-- Name: interests interests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interests
    ADD CONSTRAINT interests_pkey PRIMARY KEY (id);

--
-- Name: interests interests_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interests
    ADD CONSTRAINT interests_slug_key UNIQUE (slug);

--
-- Name: pois pois_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pois
    ADD CONSTRAINT pois_pkey PRIMARY KEY (id);

--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (name);

--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);

--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (id);

--
-- Name: trips trips_share_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_share_code_key UNIQUE (share_code);

--
-- Name: user_interests user_interests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_interests
    ADD CONSTRAINT user_interests_pkey PRIMARY KEY (user_id, interest_id);

--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id);

--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

--
-- Name: idx_day_plan_items_poi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_day_plan_items_poi ON public.day_plan_items USING btree (poi_id);

--
-- Name: idx_pois_city_interest; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pois_city_interest ON public.pois USING btree (city_id, interest_id);

--
-- Name: idx_pois_interest; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pois_interest ON public.pois USING btree (interest_id);

--
-- Name: idx_pois_name_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pois_name_lower ON public.pois USING btree (lower((name)::text) text_pattern_ops);

--
-- Name: idx_sessions_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_expires ON public.sessions USING btree (expires_at);

--
-- Name: idx_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user ON public.sessions USING btree (user_id);

--
-- Name: idx_trips_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trips_city ON public.trips USING btree (city_id);

--
-- Name: idx_trips_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trips_user_created ON public.trips USING btree (user_id, created_at DESC);

--
-- Name: idx_user_interests_interest; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_interests_interest ON public.user_interests USING btree (interest_id);

--
-- Name: trips trg_trips_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: day_plan_items day_plan_items_day_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_plan_items
    ADD CONSTRAINT day_plan_items_day_plan_id_fkey FOREIGN KEY (day_plan_id) REFERENCES public.day_plans(id) ON DELETE CASCADE;

--
-- Name: day_plan_items day_plan_items_poi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_plan_items
    ADD CONSTRAINT day_plan_items_poi_id_fkey FOREIGN KEY (poi_id) REFERENCES public.pois(id);

--
-- Name: day_plans day_plans_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_plans
    ADD CONSTRAINT day_plans_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;

--
-- Name: pois pois_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pois
    ADD CONSTRAINT pois_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);

--
-- Name: pois pois_interest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pois
    ADD CONSTRAINT pois_interest_id_fkey FOREIGN KEY (interest_id) REFERENCES public.interests(id);

--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: trips trips_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);

--
-- Name: trips trips_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: user_interests user_interests_interest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_interests
    ADD CONSTRAINT user_interests_interest_id_fkey FOREIGN KEY (interest_id) REFERENCES public.interests(id) ON DELETE CASCADE;

--
-- Name: user_interests user_interests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_interests
    ADD CONSTRAINT user_interests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--

