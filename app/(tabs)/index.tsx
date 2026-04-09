import { useRouter } from 'expo-router';
import { getDatabase, ref, set } from 'firebase/database';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import '../../src/3_firebase';

export default function DashboardScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateSession = async () => {
    setIsLoading(true);
    try {
      const sessionCode = Math.floor(1000 + Math.random() * 9000).toString();

      const db = getDatabase();
      const sessionRef = ref(db, `sessions/${sessionCode}`);
      
      await set(sessionRef, {
        meta: {
          code: sessionCode,
          createdAt: Date.now(),
          status: 'active'
        }
      });
      
      router.push(`/session/${sessionCode}/create-card`);
    } catch (error) {
      console.error("Erro ao criar sessão:", error);
      alert("Ops! Falha ao criar a sessão. Verifique sua conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>interact<Text style={styles.highlight}>io</Text></Text>
      <Text style={styles.subtitle}>Painel do Professor</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleCreateSession}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>+ Criar Nova Sessão</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0e17', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 48, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  highlight: { color: '#a78bfa' },
  subtitle: { fontSize: 18, color: '#8b89a0', marginBottom: 60, letterSpacing: 1 },
  button: { backgroundColor: '#7c3aed', paddingVertical: 18, paddingHorizontal: 32, borderRadius: 14, width: '100%', alignItems: 'center', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});