-- One-off AR Directory sync: make production `destinations` mirror local.
-- Idempotent. Soft-deletes any production row not present in this snapshot.
-- Generated from local DB (14 rows). Delete this file after the sync runs.

BEGIN;

CREATE TEMP TABLE _sync_dest_ids (id text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO _sync_dest_ids (id) VALUES
  ('block-blok-k18a'),
  ('block-blok-k18b'),
  ('65d71ab9-9746-4fea-8ce4-effb3c886d38'),
  ('dd75d0ea-3198-4294-9107-bee712a7f1be'),
  ('f77b588a-3811-4b32-98a6-357ec6779dfd'),
  ('c695bed8-bac7-4d0e-a0ef-4924616fae13'),
  ('d7181697-2835-4bec-81a6-4e442108ad12'),
  ('43f87a38-86bf-4dd5-aa25-df61dfb37e0e'),
  ('9bd31184-1ba5-4597-979e-bafb6a62c532'),
  ('hall-dewan-sutera'),
  ('seminar-bilik-seminar'),
  ('meeting-meeting-room'),
  ('admin-pejabat-pentadbiran-kiz'),
  ('office-pejabat-ukm-real-estate');

INSERT INTO destinations (
  id, name, type, icon, latitude, longitude, indoor,
  building, description, sort_order, created_at, updated_at, deleted_at
) VALUES
  ('block-blok-k18a', 'Block K18A', 'block'::"DestinationType", 'apartment', 2.928875, 101.781804, false, NULL, 'Residence block - K18A', 2, '2026-09-09 17:49:08.989', '2026-09-10 03:58:15.3', NULL),
  ('block-blok-k18b', 'Block K18B', 'block'::"DestinationType", 'apartment', 2.929741, 101.782134, false, NULL, 'Residence block - K18B', 2, '2026-09-09 17:49:08.992', '2026-09-10 03:56:03.592', NULL),
  ('65d71ab9-9746-4fea-8ce4-effb3c886d38', 'Block K18C', 'block'::"DestinationType", 'apartment', 2.930271, 101.782408, false, NULL, 'Residence Block - K18C', 3, '2026-09-10 03:55:54.457', '2026-09-10 03:55:54.457', NULL),
  ('dd75d0ea-3198-4294-9107-bee712a7f1be', 'Block K18D', 'block'::"DestinationType", 'apartment', 2.930533, 101.782971, false, NULL, 'Residence Block - K18D', 4, '2026-09-10 03:57:15.933', '2026-09-10 03:57:22.611', NULL),
  ('f77b588a-3811-4b32-98a6-357ec6779dfd', 'Block K19A', 'block'::"DestinationType", 'apartment', 2.929103, 101.78444, false, NULL, 'Residential Block - K19A', 5, '2026-09-10 04:01:53.475', '2026-09-10 04:07:49.274', NULL),
  ('c695bed8-bac7-4d0e-a0ef-4924616fae13', 'Block K19B', 'block'::"DestinationType", 'apartment', 2.929628, 101.784255, false, NULL, 'Residential Block - K19B', 6, '2026-09-10 04:02:33.652', '2026-09-10 04:07:54.457', NULL),
  ('d7181697-2835-4bec-81a6-4e442108ad12', 'Block K19C', 'block'::"DestinationType", 'apartment', 2.929959, 101.783717, false, NULL, 'Residential Block - K19C', 7, '2026-09-10 04:04:24.779', '2026-09-10 04:07:58.816', NULL),
  ('43f87a38-86bf-4dd5-aa25-df61dfb37e0e', 'Block K19D', 'block'::"DestinationType", 'apartment', 2.92964, 101.783821, false, NULL, 'Residential Block - K19D', 9, '2026-09-10 04:06:17.799', '2026-09-10 04:08:08.06', NULL),
  ('9bd31184-1ba5-4597-979e-bafb6a62c532', 'Block K20A (Guest House)', 'facility'::"DestinationType", 'meeting_room', 2.928797, 101.783807, false, NULL, 'Residential Block - K20A (Guest House)', 10, '2026-09-10 04:07:16.255', '2026-09-10 04:08:12.768', NULL),
  ('hall-dewan-sutera', 'Dewan Sutera', 'hall'::"DestinationType", 'theater_comedy', 2.930325, 101.784139, false, 'Administrative Block', 'Main college hall — assembly, events, exams', 11, '2026-09-09 17:49:08.994', '2026-09-10 04:08:18.643', NULL),
  ('seminar-bilik-seminar', 'Bilik Seminar 1', 'seminar'::"DestinationType", 'co_present', 2.930663, 101.783574, true, 'Bangunan Pentadbiran', 'Seminar room', 12, '2026-09-09 17:49:08.996', '2026-09-10 04:08:23.117', NULL),
  ('meeting-meeting-room', 'Meeting Room', 'meeting'::"DestinationType", 'forum', 2.930624, 101.783985, true, 'Bangunan Pentadbiran', 'KIZ main meeting room', 13, '2026-09-09 17:49:08.998', '2026-09-10 04:08:27.432', NULL),
  ('admin-pejabat-pentadbiran-kiz', 'Pejabat Pentadbiran KIZ', 'admin'::"DestinationType", 'admin_panel_settings', 2.930616, 101.783718, true, 'Bangunan Pentadbiran', 'College administration — registration, resident matters, forms', 14, '2026-09-09 17:49:08.999', '2026-09-10 04:08:31.788', NULL),
  ('office-pejabat-ukm-real-estate', 'Pejabat UKM Real Estate', 'office'::"DestinationType", 'domain', 2.930539, 101.783949, true, 'Bangunan Pentadbiran', 'Property, facility and building management matters', 15, '2026-09-09 17:49:09.001', '2026-09-10 04:08:36.675', NULL)
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  type        = EXCLUDED.type,
  icon        = EXCLUDED.icon,
  latitude    = EXCLUDED.latitude,
  longitude   = EXCLUDED.longitude,
  indoor      = EXCLUDED.indoor,
  building    = EXCLUDED.building,
  description = EXCLUDED.description,
  sort_order  = EXCLUDED.sort_order,
  created_at  = EXCLUDED.created_at,
  updated_at  = EXCLUDED.updated_at,
  deleted_at  = EXCLUDED.deleted_at;

UPDATE destinations
SET deleted_at = now()
WHERE deleted_at IS NULL
  AND id NOT IN (SELECT id FROM _sync_dest_ids);

COMMIT;
