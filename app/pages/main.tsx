// app/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { scale } from '@/utils/metrics';

interface Movie {
  movieName: string;
  imageUrl: string;
  description: string;
  rating: string;
}

export default function HomeScreen() {
  const [mood, setMood] = useState<string>('');
  const [language, setLanguage] = useState<string>('en');
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const movieCardOpacity = useRef(new Animated.Value(0)).current;
  const movieCardScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (movie) {
      movieCardOpacity.setValue(0);
      movieCardScale.setValue(0.9);

      Animated.parallel([
        Animated.timing(movieCardOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.spring(movieCardScale, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [movie]);

  useEffect(() => {
  }, []);

  const detectLanguage = async (text: string): Promise<string> => {
    if (!text.trim()) return 'en';

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer `,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: `Detect the language of the following text: "${text}". Respond with only the 2-letter ISO 639-1 language code (e.g., "en", "ar", "fr").` }],
          temperature: 0,
          max_tokens: 5,
        }),
      });

      if (!response.ok) {
        return 'en';
      }

      const data = await response.json();
      const detectedLang = data.choices[0]?.message?.content?.trim().toLowerCase();
      if (detectedLang && /^[a-z]{2}$/.test(detectedLang)) {
        return detectedLang;
      }
      return 'en';
    } catch (err) {
      return 'en';
    }
  };

  const handleGetRecommendation = async () => {
    if (!mood.trim()) {
      setError('Input Required: Please enter your mood.');
      return;
    }

    setLoading(true);
    setMovie(null);
    setError(null);

    try {
      const detectedInputLanguage = await detectLanguage(mood);
      setLanguage(detectedInputLanguage);

      const openaiPromptForTitle = `Suggest one movie title that perfectly fits a '${mood}' mood.
      Respond with only the movie title, nothing else. The recommended movie's plot should be understandable or relatable in ${detectedInputLanguage} if applicable.`;

      const openaiTitleResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer `,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: openaiPromptForTitle }],
          temperature: 0.7,
          max_tokens: 50,
        }),
      });

      if (!openaiTitleResponse.ok) {
        const errorData = await openaiTitleResponse.json();
        throw new Error(`OpenAI Title API error: ${openaiTitleResponse.status} - ${errorData.error?.message || 'Unknown OpenAI error'}`);
      }

      const openaiTitleData = await openaiTitleResponse.json();
      let movieTitle = openaiTitleData.choices[0]?.message?.content?.trim();

      if (!movieTitle) {
        throw new Error("OpenAI did not return a valid movie title.");
      }

      const omdbSearchResponse = await fetch(`http://www.omdbapi.com/?apikey=&t=${encodeURIComponent(movieTitle)}&plot=full&r=json`);

      if (!omdbSearchResponse.ok) {
        const errorText = await omdbSearchResponse.text();
        throw new Error(`OMDb API error: ${omdbSearchResponse.status} - ${omdbSearchResponse.statusText}. Response: ${errorText}`);
      }

      const omdbMovieData = await omdbSearchResponse.json();

      if (omdbMovieData.Response === 'False') {
        throw new Error(`Movie "${movieTitle}" not found on OMDb or API error: ${omdbMovieData.Error}`);
      }

      const originalMovieName = omdbMovieData.Title;
      const originalPlot = omdbMovieData.Plot;
      const posterUrl = omdbMovieData.Poster && omdbMovieData.Poster !== 'N/A' ?
                        omdbMovieData.Poster :
                        `https://placehold.co/500x750/CCCCCC/000000?text=No+Poster`;
      const movieRating = omdbMovieData.imdbRating && omdbMovieData.imdbRating !== 'N/A' ?
                          omdbMovieData.imdbRating :
                          'N/A';

      let translatedPlot = originalPlot;

      if (detectedInputLanguage !== 'en' && originalPlot && originalPlot !== 'N/A') {
        const openaiPromptForTranslation = `Translate the following movie plot into ${detectedInputLanguage} while keeping the original movie title and tone. Only provide the translated plot.
        Original Plot: "${originalPlot}"`;

        const openaiTranslationResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer `,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: openaiPromptForTranslation }],
            temperature: 0.5,
            max_tokens: 500,
          }),
        });

        if (openaiTranslationResponse.ok) {
          const translationData = await openaiTranslationResponse.json();
          const translationResult = translationData.choices[0]?.message?.content?.trim();
          if (translationResult) {
            translatedPlot = translationResult;
          }
        }
      } else if (originalPlot === 'N/A') {
          translatedPlot = "No description available.";
      }

      const recommendedMovie = {
        movieName: originalMovieName,
        imageUrl: posterUrl,
        description: translatedPlot,
        rating: movieRating,
      };

      if (recommendedMovie.imageUrl && recommendedMovie.imageUrl.startsWith('http')) {
        setMovie(recommendedMovie);
      } else {
        setError('Received invalid image URL from OMDb. Displaying placeholder.');
        setMovie({ ...recommendedMovie, imageUrl: 'https://placehold.co/500x750/CCCCCC/000000?text=No+Image' });
      }

    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes('Network request failed')) {
        setError('Network error: Please ensure your device has internet access.');
      } else {
        setError('An error occurred: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
        <Image source={require("@/assets/images/yespng.png")}
        style={{
            width: 90,
            height:90,
            marginTop:scale(5)
        }}
        />
      <Text style={styles.title}>Vibe<Text style={styles.span}>Watch</Text></Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Your Mood:</Text>
        <TextInput
          style={styles.textInput}
          placeholder="write here..."
          placeholderTextColor="#a0a0a0"
          value={mood}
          onChangeText={setMood}
          autoCapitalize="none"
          multiline
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleGetRecommendation}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <MaterialIcons name="movie-filter" size={24} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Find My Vibe</Text>
          </>
        )}
      </TouchableOpacity>

      {error && (
        <View style={styles.messageContainer}>
          <Ionicons name="alert-circle-outline" size={20} color="#ffdddd" style={styles.errorIcon} />
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      )}

      {movie && (
        <Animated.View
          style={[
            styles.movieCard,
            {
              opacity: movieCardOpacity,
              transform: [{ scale: movieCardScale }],
            },
          ]}
        >
          <Text style={styles.movieName}>{movie.movieName}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={20} color="#FFD700" />
            <Text style={styles.movieRating}>IMDb: {movie.rating}</Text>
          </View>
          <Image
            source={{ uri: movie.imageUrl }}
            style={styles.movieImage}
            resizeMode="contain"
            onError={(e) => {
              setMovie(prev => prev ? { ...prev, imageUrl: 'https://placehold.co/500x750/CCCCCC/000000?text=Image+Error' } : null);
            }}
          />
          <Text style={styles.movieDescription}>{movie.description}</Text>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#1a0033',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    color: '#e0e0e0',
    marginBottom: 30,
    marginTop: Platform.OS === 'android' ? 5 : 0,
    textAlign:"center",
    fontFamily:"Poppins-Bold.ttf"
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#e0e0e0',
    marginBottom: 8,
    fontWeight: '600',
    textAlign:'center',
    marginTop:30,
    fontFamily:"Poppins-Bold.ttf"
  },
  textInput: {
    width: '100%',
    height: 120,
    padding: 15,
    backgroundColor: '#3a0066',
    borderRadius: 10,
    fontSize: 16,
    color: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    borderWidth:0.3 ,
    borderColor:'grey',
    fontFamily:"IBMP"
  },
  button: {
    backgroundColor: '#8a2be2',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginTop: 20,
    shadowColor: '#6a1bb2',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily:"Poppins-Bold.ttf"
  },
  messageContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#ff003344',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff0033',
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  errorIcon: {
    marginRight: 10,
  },
  errorMessage: {
    color: '#ffdddd',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    flexShrink: 1,
  },
  movieCard: {
    backgroundColor: '#4a0080',
    borderRadius: 15,
    padding: 20,
    marginTop: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  movieName: {
    fontSize: 24,
    color: '#e0e0e0',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily:"Poppins-Bold.ttf"
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  movieRating: {
    fontSize: 18,
    color: '#FFD700',
    marginLeft: 5,
    fontFamily:"Poppins-Bold.ttf"
  },
  movieImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#2c0059',
  },
  movieDescription: {
    fontSize: 16,
    color: '#e0e0e0',
    lineHeight: 24,
    textAlign: 'center',
    fontFamily:"IBMP" ,
    fontWeight:"500"
  },
  span:{
    color:"purple",
    fontFamily:"inter-Bold"
  }
});
