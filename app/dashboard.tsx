import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { getAuth, signOut } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database'; // Novos imports do banco de dados
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import '../src/firebase';

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [activeMenu, setActiveMenu] = useState('inicio');
  const [isCreating, setIsCreating] = useState(false); // Estado para o botão de loading

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.replace('/'); 
  };

  // ── A MÁGICA DE CRIAR A SESSÃO ──
  const handleCreateSession = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      alert("Você precisa estar logado.");
      return;
    }

    setIsCreating(true);
    try {
      const db = getDatabase();
      
      // 1. Gera as letras aleatórias (Ex: BX)
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const l1 = letters.charAt(Math.floor(Math.random() * letters.length));
      const l2 = letters.charAt(Math.floor(Math.random() * letters.length));
      
      // 2. Gera os números aleatórios (Ex: 4927)
      const numbers = Math.floor(1000 + Math.random() * 9000);
      
      // 3. Junta tudo
      const sessionCode = `${l1}${l2}-${numbers}`; 

      // 4. Salva a fundação da sessão no Firebase
      const sessionRef = ref(db, `sessions/${sessionCode}`);
      await set(sessionRef, {
        metadata: {
          ownerId: user.uid, // Guarda quem é o dono
          createdAt: Date.now(),
          status: 'waiting' // Status inicial: aguardando
        }
      });

      // 5. Manda o professor para a tela de criar a pergunta, passando o ID gerado
      router.push(`/session/${sessionCode}/create-card`);

    } catch (error) {
      console.error(error);
      alert("Erro ao criar sessão. Verifique sua conexão.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {!isMobile && (
        <View style={styles.sidebar}>
          <View style={styles.logoContainer}>
            <Text style={styles.title}>
              inter<Text style={styles.highlight}>actio</Text>
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>APRESENTADOR</Text>
            </View>
          </View>

          <View style={styles.nav}>
            <TouchableOpacity 
              style={[styles.navItem, activeMenu === 'inicio' && styles.navItemActive]}
              onPress={() => setActiveMenu('inicio')}
            >
              <Feather name="home" size={20} color={activeMenu === 'inicio' ? '#a78bfa' : '#8b89a0'} />
              <Text style={[styles.navText, activeMenu === 'inicio' && styles.navTextActive]}>Início</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navItem, activeMenu === 'sessoes' && styles.navItemActive]}
              onPress={() => setActiveMenu('sessoes')}
            >
              <Feather name="layers" size={20} color={activeMenu === 'sessoes' ? '#a78bfa' : '#8b89a0'} />
              <Text style={[styles.navText, activeMenu === 'sessoes' && styles.navTextActive]}>Minhas Sessões</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navItem, activeMenu === 'config' && styles.navItemActive]}
              onPress={() => setActiveMenu('config')}
            >
              <Feather name="settings" size={20} color={activeMenu === 'config' ? '#a78bfa' : '#8b89a0'} />
              <Text style={[styles.navText, activeMenu === 'config' && styles.navTextActive]}>Configurações</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Feather name="log-out" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.mainContent} contentContainerStyle={styles.mainContentContainer}>
        
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bem-vindo de volta,</Text>
            <Text style={styles.pageTitle}>Seu Painel</Text>
          </View>
          
          {/* Botão atualizado com estado de carregamento */}
          <TouchableOpacity 
            style={styles.createButton}
            onPress={handleCreateSession}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator color="#0f0e17" size="small" />
            ) : (
              <>
                <Feather name="plus" size={20} color="#0f0e17" />
                <Text style={styles.createButtonText}>Nova Sessão</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.dashboardGrid}>
          <View style={styles.emptyStateCard}>
            <View style={styles.iconCircle}>
              <Feather name="inbox" size={32} color="#a78bfa" />
            </View>
            <Text style={styles.emptyStateTitle}>Nenhuma sessão recente</Text>
            <Text style={styles.emptyStateDesc}>Crie sua primeira sessão interativa para engajar seus alunos em tempo real.</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// Estilos mantidos exatamente como você aprovou
const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#0f0e17' },
  sidebar: { width: 280, backgroundColor: '#1a1924', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.05)', padding: 24, justifyContent: 'space-between' },
  logoContainer: { alignItems: 'flex-start', marginBottom: 48 },
  title: { fontFamily: Platform.OS === 'web' ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : undefined, fontSize: 40, fontWeight: '800', letterSpacing: -1.5, color: '#e8e6f0', lineHeight: 40 },
  highlight: { color: '#a78bfa' },
  badge: { backgroundColor: 'rgba(167, 139, 250, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, marginTop: 4 },
  badgeText: { fontSize: 9, color: '#a78bfa', fontWeight: '800', letterSpacing: 1.2 },
  nav: { flex: 1, gap: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  navItemActive: { backgroundColor: 'rgba(167, 139, 250, 0.1)' },
  navText: { color: '#8b89a0', fontSize: 16, fontWeight: '600' },
  navTextActive: { color: '#a78bfa', fontWeight: '800' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, marginTop: 24 },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
  mainContent: { flex: 1 },
  mainContentContainer: { padding: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48 },
  greeting: { color: '#8b89a0', fontSize: 16, fontWeight: '500', marginBottom: 4 },
  pageTitle: { color: '#e8e6f0', fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  createButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#a78bfa', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, shadowColor: '#a78bfa', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, minWidth: 160, justifyContent: 'center' },
  createButtonText: { color: '#0f0e17', fontSize: 16, fontWeight: '800' },
  dashboardGrid: { flex: 1 },
  emptyStateCard: { backgroundColor: '#1a1924', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 48, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(167, 139, 250, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyStateTitle: { color: '#e8e6f0', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyStateDesc: { color: '#8b89a0', fontSize: 16, textAlign: 'center', maxWidth: 400 },
});