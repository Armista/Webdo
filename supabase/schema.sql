-- ============================================================================
-- WEBDO AUTOPARTES RD - ESTRUCTURA DE BASE DE DATOS (SUPABASE / POSTGRESQL)
-- ============================================================================

-- 1. EXTENSIÓN PARA GENERACIÓN DE IDENTIFICADORES UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. TABLA DE REPUESTOS / PRODUCTOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    oem TEXT NOT NULL,
    location TEXT DEFAULT 'Almacén Central',
    category TEXT NOT NULL DEFAULT 'Motor',
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    old_price NUMERIC(12, 2),
    in_stock BOOLEAN NOT NULL DEFAULT true,
    is_bestseller BOOLEAN NOT NULL DEFAULT false,
    is_offer BOOLEAN NOT NULL DEFAULT false,
    images TEXT[] NOT NULL DEFAULT '{}',
    compatibility JSONB NOT NULL DEFAULT '[]'::jsonb,
    cross_references TEXT[] DEFAULT '{}',
    specs JSONB DEFAULT '{}'::jsonb,
    short_desc TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices optimizados para búsquedas rápidas (por SKU, OEM, Categoría y Nombre)
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);
CREATE INDEX IF NOT EXISTS idx_products_oem ON public.products (oem);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products USING gin (to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_products_compat ON public.products USING gin (compatibility);

-- ============================================================================
-- 3. TABLA DE MARCAS Y MODELOS DE VEHÍCULOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vehicle_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    make TEXT NOT NULL UNIQUE,
    models TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 4. TABLA DE GALERÍA DE IMÁGENES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.media_gallery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    data_url TEXT NOT NULL,
    size TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 5. FUNCIÓN Y TRIGGERS PARA FECHA DE MODIFICACIÓN AUTOMÁTICA
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_products_updated_at ON public.products;
CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trigger_vehicles_updated_at ON public.vehicle_catalog;
CREATE TRIGGER trigger_vehicles_updated_at
    BEFORE UPDATE ON public.vehicle_catalog
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_timestamp();

-- ============================================================================
-- 6. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- ============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_gallery ENABLE ROW LEVEL SECURITY;

-- Lectura pública: cualquier cliente puede ver repuestos y vehículos
CREATE POLICY "Acceso Publico Lectura Productos" ON public.products FOR SELECT USING (true);
CREATE POLICY "Acceso Publico Lectura Vehiculos" ON public.vehicle_catalog FOR SELECT USING (true);
CREATE POLICY "Acceso Publico Lectura Galeria" ON public.media_gallery FOR SELECT USING (true);

-- Escritura y gestión (Inserción, Modificación y Eliminación)
CREATE POLICY "Permitir Escritura Productos" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir Escritura Vehiculos" ON public.vehicle_catalog FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir Escritura Galeria" ON public.media_gallery FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 7. BUCKET DE ALMACENAMIENTO PARA FOTOS (SUPABASE STORAGE)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas del bucket de almacenamiento para fotos públicas
CREATE POLICY "Acceso Publico Fotos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'product-images');

CREATE POLICY "Subida Fotos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Modificacion Fotos"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'product-images');

CREATE POLICY "Eliminacion Fotos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'product-images');
