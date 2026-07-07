/* Clé publique (anon) uniquement — c'est fait pour être exposée côté
   client, la sécurité réelle est assurée par les fonctions RPC
   (voir supabase/schema.sql) qui vérifient le mot de passe côté serveur. */
const SUPABASE_URL = "https://sb.batoucode.ovh";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgzNDI1MjkyLCJleHAiOjE5NDExMDUyOTJ9.UsksbUNu4-_KNIyWYg42VscB3FCjRPUj5gBT1qIyFVQ";
