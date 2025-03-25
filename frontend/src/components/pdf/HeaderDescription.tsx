import { Text, View, StyleSheet } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
  section: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titulo: {
    fontSize: 14,
    fontWeight: 600,
    color: '#232323',
    marginTop: 13,
    marginBottom: 10,
  },
  dataText: {
    fontSize: 11,
    fontWeight: 500,
    color: '#232323',
  },
});

interface IHeaderDescription {
  name: string;
  nivel: string;
}

const getCurrentDate = (): string => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Mês começa do 0
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

// Create Document Component
export const HeaderDescription = ({ name, nivel }: IHeaderDescription) => (
  <View style={styles.section}>
    <Text style={styles.titulo}>
      Laboratórios de Solos e Sustentabilidade Ambiental - IFPE
    </Text>
    <Text style={styles.dataText}>
      {name} - {nivel}
    </Text>
    <Text style={styles.dataText}>{getCurrentDate()}</Text>
  </View>
);
