import React from 'react'
import { StyleSheet, View, SafeAreaView, StatusBar, Dimensions } from 'react'
import { WebView } from 'react-native-webview'

export default function App() {
  // Production build URI / Local development web server
  const webAppUri = 'http://localhost:5173'

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden={true} />
      <WebView
        source={{ uri: webAppUri }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        scalesPageToFit={true}
        bounces={false}
        scrollEnabled={false}
        overScrollMode="never"
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4eedd',
  },
  webview: {
    flex: 1,
    backgroundColor: '#f4eedd',
  },
})
