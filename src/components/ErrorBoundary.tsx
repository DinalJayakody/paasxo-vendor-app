import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string | null;
}

/**
 * Temporary diagnostic net: on a release build there's no redbox and no adb
 * access to the failing device, so an uncaught render error just crashes the
 * app with nothing to go on. This renders the error + component stack on
 * screen instead, so it can be read/photographed directly off the phone.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    this.setState({ componentStack: info.componentStack });
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>App crashed</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Text style={styles.stack}>{this.state.error.stack}</Text>
          {this.state.componentStack ? (
            <>
              <Text style={styles.title}>Component stack</Text>
              <Text style={styles.stack}>{this.state.componentStack}</Text>
            </>
          ) : null}
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0000' },
  content: { padding: 20, paddingTop: 60 },
  title: { color: '#ff6b6b', fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  message: { color: '#fff', fontSize: 14, marginBottom: 12 },
  stack: { color: '#ccc', fontSize: 11, fontFamily: 'monospace' },
});
