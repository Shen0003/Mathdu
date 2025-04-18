import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Animated,
  PanResponder,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppContext } from '../context/AppContext';
import Icon from '../ui/Icon';

const { width } = Dimensions.get('window');
const NUMBER_ITEM_WIDTH = 60;
const NUMBER_ITEM_MARGIN = 5;

const OrderingScreen = ({ navigation }) => {
  const { updateProgressScore } = useContext(AppContext);
  const [level, setLevel] = useState(1);
  const [numbers, setNumbers] = useState([]);
  const [orderedNumbers, setOrderedNumbers] = useState([]);
  const [orderDirection, setOrderDirection] = useState('ascending');
  const [score, setScore] = useState(0);
  const [answeredWrong, setAnsweredWrong] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [animations, setAnimations] = useState([]);
  const [countdown, setCountdown] = useState(3); // Countdown from 3
  const [gameStarted, setGameStarted] = useState(false); // Track if game has started
  const [showBar, setShowBar] = useState(false); // Show progress bar
  const wrongAnswers = 3;

  
  // Generate random numbers based on level
  const generateNumbers = (newLevel) => {
    let numberSet = [];
    let count = 3;
    
    // Determine number count and range based on level
    switch(newLevel) {
      case 1: // Simple sequences (3-5 single-digit numbers)
        count = Math.floor(Math.random() * 3) + 3; // 3 to 5 numbers
        for (let i = 0; i < count; i++) {
          let num;
          do {
            num = Math.floor(Math.random() * 9) + 1;
          } while (numberSet.includes(num));
          numberSet.push(num);
        }
        break;
        
      case 2: // Mixed sequences (single and double-digit numbers)
        count = Math.floor(Math.random() * 2) + 4; // 4 to 5 numbers
        for (let i = 0; i < count; i++) {
          let num;
          do {
            if (i < 2) {
              num = Math.floor(Math.random() * 9) + 1; // Single digit
            } else {
              num = Math.floor(Math.random() * 90) + 10; // Double digit
            }
          } while (numberSet.includes(num));
          numberSet.push(num);
        }
        break;
        
      case 3: // Reverse order (practice with both ascending and descending)
        count = Math.floor(Math.random() * 2) + 4; // 4 to 5 numbers
        for (let i = 0; i < count; i++) {
          let num;
          do {
            num = Math.floor(Math.random() * 50) + 1;
          } while (numberSet.includes(num));
          numberSet.push(num);
        }
        // Randomly choose ordering direction
        setOrderDirection(Math.random() < 0.5 ? 'ascending' : 'descending');
        break;
        
      default:
        count = 3;
        for (let i = 0; i < count; i++) {
          let num;
          do {
            num = Math.floor(Math.random() * 9) + 1;
          } while (numberSet.includes(num));
          numberSet.push(num);
        }
    }
    
    // Shuffle the array
    for (let i = numberSet.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numberSet[i], numberSet[j]] = [numberSet[j], numberSet[i]];
    }
    
    setNumbers(numberSet);
    setOrderedNumbers([...numberSet]);
    
    // Initialize animations array
    const newAnimations = numberSet.map(() => new Animated.ValueXY());
    setAnimations(newAnimations);
  };
  
  // Create pan responders for draggable number items
  const createPanResponder = (index) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !submitted,
      onMoveShouldSetPanResponder: () => !submitted,
      onPanResponderGrant: () => {
        animations[index].setOffset({
          x: animations[index].x._value,
          y: animations[index].y._value
        });
        animations[index].setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: animations[index].x, dy: animations[index].y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, gesture) => {
        animations[index].flattenOffset();
        
        // Calculate positions for reordering
        const newOrder = [...orderedNumbers];
        const movingItem = newOrder[index];
        
        // Calculate the new position based on gesture
        const itemWidth = NUMBER_ITEM_WIDTH + NUMBER_ITEM_MARGIN * 2;
        const newPosition = Math.round(gesture.dx / itemWidth);
        
        let newIndex = index + newPosition;
        newIndex = Math.max(0, Math.min(newIndex, orderedNumbers.length - 1));
        
        if (newIndex !== index) {
          // Remove item from old position
          newOrder.splice(index, 1);
          // Insert at new position
          newOrder.splice(newIndex, 0, movingItem);
          
          // Update state
          setOrderedNumbers(newOrder);
          
          // Reset all animations
          animations.forEach(anim => anim.setValue({ x: 0, y: 0 }));
        } else {
          // Snap back to position
          Animated.spring(animations[index], {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false
          }).start();
        }
      }
    });
  };
  
  // Handle submission of answer
  const handleSubmit = () => {
    setShowBar(true);
    let newQuestionsAnswered = questionsAnswered + 1;
    setQuestionsAnswered(newQuestionsAnswered);
    // Check if ordering is correct
    let correct = true;
    const sortedNumbers = [...numbers].sort((a, b) => 
      orderDirection === 'ascending' ? a - b : b - a
    );
    
    for (let i = 0; i < sortedNumbers.length; i++) {
      if (sortedNumbers[i] !== orderedNumbers[i]) {
        correct = false;
        break;
      }
    }
    
    setSubmitted(true);
    setIsCorrect(correct);
    
    let newScore = score;
    let newAnsweredWrong = answeredWrong;
    // Update score and question count
    if (correct) {
      newScore += 1;
      setScore(newScore); // **will only change state value to NEW one after the whole handleAnswer function is executed!
    } else {
      newAnsweredWrong += 1;
      setAnsweredWrong(newAnsweredWrong); // **will only change state value to NEW one after the whole handleAnswer function is executed!
    }

    // Determine new level based on questions answered

    let newLevel = level;

    if (newQuestionsAnswered >= 10) {  // Change level at exactly 10 tries
      newLevel = 3;
    } else if (newQuestionsAnswered >= 5) {  // Change level at exactly 5 tries
      newLevel = 2;
    } else {
      newLevel = 1;
    }
    setLevel(newLevel);
    
    // Wait before proceeding to next question or ending game
    setTimeout(() => {
      // Check if game is over
      if (newAnsweredWrong >= wrongAnswers) {
        // Update progress
        updateProgressScore('ordering', score);
        
        // Show results
        Alert.alert(
          'Game Over!',
          `Your score: ${score}`,
          [
            { 
              text: 'Try Again', 
              onPress: () => resetGame() 
            },
            { 
              text: 'Home', 
              onPress: () => navigation.goBack() 
            }
          ]
        );
      } else {
        // Generate new numbers for next question
        setSubmitted(false);
        setIsCorrect(null);
        generateNumbers(newLevel);
        setShowBar(false);
      }
    }, 1500);
  };
  
  // Reset the game
  const resetGame = () => {
    setScore(0);
    setQuestionsAnswered(0);
    setAnsweredWrong(0);
    setLevel(1);
    setIsCorrect(null);
    generateNumbers(1);
    setGameStarted(false);
    setSubmitted(false);
    setCountdown(3);
    setShowBar(false);
  };
  
  // Render individual draggable number item
  const renderNumberItem = (number, index) => {
    const panResponder = createPanResponder(index);
    
    return (
      <Animated.View
        key={index}
        style={[
          styles.numberItem,
          {
            transform: [
              { translateX: animations[index]?.x || 0 },
              { translateY: animations[index]?.y || 0 }
            ]
          },
          submitted && {
            backgroundColor: isCorrect ? '#7fd67f' : '#ff7f7f'
          }
        ]}
        {...panResponder?.panHandlers}
      >
        <Text style={styles.numberItemText}>{number}</Text>
      </Animated.View>
    );
  };

    // Initialize the game with countdown
    useEffect(() => {
      if (gameStarted) return; // skip this effect if game has already started
      
      // Start the countdown
      const countdownInterval = setInterval(() => {
        setCountdown(prevCount => {
          if (prevCount <= 1) {
            clearInterval(countdownInterval);
            setGameStarted(true);
            generateNumbers(1);
            return 0;
          }
          return prevCount - 1;
        });
      }, 1000);
      // Cleanup interval if component unmounts
      return () => clearInterval(countdownInterval);
    }, [gameStarted]); // only call this when initializing

  
  // Render countdown or game based on gameStarted state
  if (!gameStarted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.levelTitle}>Level {level}</Text>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{score}</Text>
            <Icon name="star" size={24} color="#f8b400" />
          </View>
        </View>
        
        <View style={styles.countdownContainer}>
          <Image 
            source={require('../assets/ordering_icon.png')} 
            style={styles.symbolImage} 
          />
          <Text style={styles.countdownText}>Get Ready!</Text>
          <Text style={styles.countdownNumber}>{countdown}</Text>
          <Text style={styles.countdownInstructions}>
            You will need to pick the number that is correct!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
            <Icon name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.levelTitle}>Level {level}</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{score}</Text>
          <Icon name="star" size={24} color="#f8b400" />
        </View>
      </View>
      
      <View style={styles.questionContainer}>
        <View style={styles.questionTextContainer}>
          <Image 
            source={require('../assets/ordering_icon.png')} 
            style={styles.symbolImage} 
          />
          <Text style={styles.questionText}>
            Arrange the numbers in {orderDirection} order
          </Text>
        </View>
        
        <View style={styles.directionsContainer}>
          <Image 
            source={
              orderDirection === 'ascending' 
                ? require('../assets/ascending_icon.png') 
                : require('../assets/descending_icon.png')
            } 
            style={styles.directionIcon} 
          />
          <Text style={styles.directionText}>
            {orderDirection === 'ascending' 
              ? 'Smallest to Largest' 
              : 'Largest to Smallest'}
          </Text>
        </View>
        
        <View style={styles.numbersContainer}>
          {orderedNumbers.map((number, index) => renderNumberItem(number, index))}
        </View>
        
        <TouchableOpacity
          style={[
            styles.submitButton,
            submitted && { 
              backgroundColor: isCorrect ? '#7fd67f' : '#ff7f7f' 
            }
          ]}
          onPress={handleSubmit}
          disabled={submitted}
        >
          <Text style={styles.submitButtonText}>
            {submitted 
              ? (isCorrect ? 'Correct!' : 'Try Again!') 
              : 'Check Order'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            {orderDirection === 'ascending' 
              ? 'Tip: Drag to arrange from smallest to largest' 
              : 'Tip: Drag to arrange from largest to smallest'}
          </Text>
        </View>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: showBar ? '#f06292' : '#eee' }]}></View>
        <Text style={styles.progressText}>
          {questionsAnswered} Questions
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f6ff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 10,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f06292',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f06292',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scoreText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  starIcon: {
    width: 24,
    height: 24,
    marginRight: 5,
  },
  questionTextContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  symbolImage: {
    width: 40,
    height: 40,
    marginBottom: 10,
  },
  questionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  directionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 98, 146, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 30,
  },
  directionIcon: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  directionText: {
    fontSize: 16,
    color: '#f06292',
  },
  numbersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 30,
  },
  numberItem: {
    width: NUMBER_ITEM_WIDTH,
    height: NUMBER_ITEM_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 30,
    margin: NUMBER_ITEM_MARGIN,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  numberItemText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#f06292',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  hintContainer: {
    backgroundColor: 'rgba(240, 98, 146, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  hintText: {
    fontSize: 16,
    color: '#f06292',
    textAlign: 'center',
  },
  progressContainer: {
    padding: 20,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    marginBottom: 5,
    overflow: 'hidden',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  countdownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  countdownText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f06292',
    marginBottom: 20,
  },
  countdownNumber: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#ff9500',
    marginBottom: 30,
  },
  countdownInstructions: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
    maxWidth: '80%',
  },
});

export default OrderingScreen;