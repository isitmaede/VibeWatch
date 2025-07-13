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
  Animated, // For animations
  Easing,   // For animation easing
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; // For language selection
   import { Ionicons, MaterialIcons } from '@expo/vector-icons'; // For icons (install: npm install react-native-vector-icons)
import { scale } from '@/utils/metrics';

// ----------------------------------------------------------------------
// !!! CRITICAL SECURITY WARNING !!!
// Embedding API keys directly in client-side code (like this) is HIGHLY INSECURE.
// For any real-world application, these API calls should be routed through a secure backend server.
// This setup is for demonstration/testing purposes ONLY.
// ----------------------------------------------------------------------

// YOUR ACTUAL API KEYS
const OPENAI_API_KEY = "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";
const OMDB_API_KEY = "8bc9de"; // Your OMDb API Key

// OpenAI API endpoint
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = "gpt-4o-mini"; // Using the model you specified

// OMDb API endpoint
const OMDB_BASE_URL = 'http://www.omdbapi.com/';

interface Movie {
  movieName: string;
  imageUrl: string;
  description: string;
  rating: string; // Added for OMDb rating
}

export default function HomeScreen() {
  const [mood, setMood] = useState<string>('');
  const [language, setLanguage] = useState<string>('en'); // Default to English
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const movieCardOpacity = useRef(new Animated.Value(0)).current;
  const movieCardScale = useRef(new Animated.Value(0.9)).current;

  // Effect to run animation when a movie is set
  useEffect(() => {
    if (movie) {
      // Reset animation values
      movieCardOpacity.setValue(0);
      movieCardScale.setValue(0.9);

      // Start parallel animations
      Animated.parallel([
        Animated.timing(movieCardOpacity, {
          toValue: 1,
          duration: 800, // Fade in over 800ms
          easing: Easing.ease,
          useNativeDriver: true, // Use native driver for performance
        }),
        Animated.spring(movieCardScale, {
          toValue: 1,
          friction: 7, // Controls bounciness
          tension: 80, // Controls speed
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [movie]); // Re-run effect when 'movie' state changes

  // Initial check for API keys - ALERTS AND WARNINGS REMOVED
  useEffect(() => {
    // This useEffect is now empty as alerts and warnings are explicitly removed.
    // API key checks are now handled within handleGetRecommendation,
    // and errors will be displayed in the UI's error message area.
  }, []);

  // Function to detect language of the input mood
  const detectLanguage = async (text: string): Promise<string> => {
    if (!text.trim()) return 'en'; // Default to English if no mood is entered

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [{ role: "user", content: `Detect the language of the following text: "${text}". Respond with only the 2-letter ISO 639-1 language code (e.g., "en", "ar", "fr").` }],
          temperature: 0,
          max_tokens: 5,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn(`Language detection API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}. Defaulting to English.`);
        return 'en';
      }

      const data = await response.json();
      const detectedLang = data.choices[0]?.message?.content?.trim().toLowerCase();
      console.log(`Detected language: ${detectedLang}`);
      // Basic validation for common 2-letter ISO codes
      if (detectedLang && /^[a-z]{2}$/.test(detectedLang)) {
        return detectedLang;
      }
      return 'en'; // Fallback to English
    } catch (err) {
      console.error('Error detecting language:', err);
      return 'en'; // Fallback to English on error
    }
  };


  const handleGetRecommendation = async () => {
    if (!mood.trim()) {
      setError('Input Required: Please enter your mood.'); // Display error on UI
      return;
    }

    // Check API keys before making calls
   


    setLoading(true);
    setMovie(null); // Clear previous movie
    setError(null); // Clear previous error

    try {
      // Detect language based on the user's mood input
      const detectedInputLanguage = await detectLanguage(mood);
      setLanguage(detectedInputLanguage); // Update language state for potential future use or display

      // --- Step 1: Get a movie suggestion (title only) from OpenAI ---
      console.log("Step 1: Calling OpenAI for movie title...");
      // Instruct OpenAI to provide the movie title and, critically,
      // to make the plot/story in the detected input language.
      const openaiPromptForTitle = `Suggest one movie title that perfectly fits a '${mood}' mood.
      Respond with only the movie title, nothing else. The recommended movie's plot should be understandable or relatable in ${detectedInputLanguage} if applicable.`;

      const openaiTitleResponse = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [{ role: "user", content: openaiPromptForTitle }],
          temperature: 0.7,
          max_tokens: 50,
        }),
      });

      if (!openaiTitleResponse.ok) {
        const errorData = await openaiTitleResponse.json();
        console.error("OpenAI Title API Raw Error:", errorData); // Log raw error
        throw new Error(`OpenAI Title API error: ${openaiTitleResponse.status} - ${errorData.error?.message || 'Unknown OpenAI error'}`);
      }

      const openaiTitleData = await openaiTitleResponse.json();
      let movieTitle = openaiTitleData.choices[0]?.message?.content?.trim();

      if (!movieTitle) {
        throw new Error("OpenAI did not return a valid movie title.");
      }
      console.log(`Step 1 Complete: OpenAI suggested movie: "${movieTitle}"`);

      // --- Step 2: Search OMDb for the movie by title ---
      console.log(`Step 2: Calling OMDb for movie details for "${movieTitle}"...`);
      const omdbSearchResponse = await fetch(`${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(movieTitle)}&plot=full&r=json`);

      if (!omdbSearchResponse.ok) {
        const errorText = await omdbSearchResponse.text(); // Get raw response text
        console.error("OMDb API Raw Error Text:", errorText); // Log raw error
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
                        `https://placehold.co/500x750/CCCCCC/000000?text=No+Poster`; // Fallback placeholder
      const movieRating = omdbMovieData.imdbRating && omdbMovieData.imdbRating !== 'N/A' ?
                          omdbMovieData.imdbRating :
                          'N/A'; // Get IMDb Rating


      console.log(`Step 2 Complete: Found movie "${originalMovieName}" on OMDb with rating: ${movieRating}.`);

      // --- Step 3: Use OpenAI to translate the movie plot to the requested language ---
      let translatedPlot = originalPlot; // Default to original if translation fails or not needed

      // Only translate if the detected input language is not English and a plot exists
      if (detectedInputLanguage !== 'en' && originalPlot && originalPlot !== 'N/A') {
        console.log(`Step 3: Calling OpenAI for plot translation to ${detectedInputLanguage}...`);
        const openaiPromptForTranslation = `Translate the following movie plot into ${detectedInputLanguage} while keeping the original movie title and tone. Only provide the translated plot.
        Original Plot: "${originalPlot}"`;

        const openaiTranslationResponse = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [{ role: "user", content: openaiPromptForTranslation }],
            temperature: 0.5,
            max_tokens: 500,
          }),
        });

        if (!openaiTranslationResponse.ok) {
          const errorData = await openaiTranslationResponse.json();
          console.warn(`OpenAI Translation API Raw Error (non-critical):`, errorData);
          console.warn(`OpenAI Translation API error: ${openaiTranslationResponse.status} - ${errorData.error?.message || 'Unknown OpenAI translation error'}. Using original plot.`);
          // Don't throw, just use original plot
        } else {
          const translationData = await openaiTranslationResponse.json();
          const translationResult = translationData.choices[0]?.message?.content?.trim();
          if (translationResult) {
            translatedPlot = translationResult;
            console.log(`Plot translated to ${detectedInputLanguage}.`);
          } else {
            console.warn(`Failed to get translation result from OpenAI, using original plot.`);
          }
        }
      } else if (originalPlot === 'N/A') {
          translatedPlot = "No description available.";
      }


      const recommendedMovie = {
        movieName: originalMovieName, // Stays in original language
        imageUrl: posterUrl, // Real poster from OMDb
        description: translatedPlot, // Translated plot from OpenAI
        rating: movieRating, // Include the rating
      };

      // Final check for image URL validity before setting movie
      if (recommendedMovie.imageUrl && recommendedMovie.imageUrl.startsWith('http')) {
        setMovie(recommendedMovie);
      } else {
        setError('Received invalid image URL from OMDb. Displaying placeholder.');
        setMovie({ ...recommendedMovie, imageUrl: 'https://placehold.co/500x750/CCCCCC/000000?text=No+Image' });
      }

    } catch (err: any) {
      console.error('Caught Error in handleGetRecommendation:', err); // Log the full error object
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
          multiline // Allow multiline input for mood description
          textAlignVertical="top" // Align text to the top for multiline
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
              console.log('Image Load Error:', e.nativeEvent.error);
              // Fallback to a generic placeholder if the image fails to load
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
    backgroundColor: '#1a0033', // Dark purple background
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    color: '#e0e0e0', // Light text on dark background
    marginBottom: 30,
    marginTop: Platform.OS === 'android' ? 5 : 0, // Adjust for Android status bar
    textAlign:"center",
    fontFamily:"Poppins-Bold.ttf" 
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#e0e0e0', // Light text
    marginBottom: 8,
    fontWeight: '600',
    textAlign:'center',
    marginTop:30,
    fontFamily:"Poppins-Bold.ttf" 
  },
  textInput: {
    width: '100%',
    height: 120, // Increased height for better multi-line input
    padding: 15, // Reduced padding to make text more visible
    backgroundColor: '#3a0066', // Darker input background
    borderRadius: 10,
    fontSize: 16,
    color: '#e0e0e0', // Light text input
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
    minWidth: 200, // Ensure button has a minimum width
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row', // For icon and text alignment
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
    backgroundColor: '#ff003344', // Semi-transparent red for errors
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff0033',
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row', // For icon and text alignment
    justifyContent: 'center',
  },
  errorIcon: {
    marginRight: 10,
  },
  errorMessage: {
    color: '#ffdddd', // Light red text
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    flexShrink: 1, // Allow text to wrap
  },
  movieCard: {
    backgroundColor: '#4a0080', // Darker purple for card
    borderRadius: 15,
    padding: 20,
    marginTop: 30,
    width: '100%',
    maxWidth: 400, // Limit card width on larger screens
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  movieName: {
    fontSize: 24,
    color: '#e0e0e0', // Light text
    marginBottom: 10, // Adjusted margin
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
    color: '#FFD700', // Gold color for rating
    marginLeft: 5,
    fontFamily:"Poppins-Bold.ttf" 
  },
  movieImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#2c0059', // Dark placeholder background
  },
  movieDescription: {
    fontSize: 16,
    color: '#e0e0e0', // Light text
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