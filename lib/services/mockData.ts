import { Tables } from '../types/database'
import { NotebookWithStats, WordWithReviews, PageWithWords } from '../types/goldlist'

// Mock user profile
export const mockProfile: Tables<'profiles'> = {
  id: 'mock-user-id',
  email: 'user@example.com',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  subscription_status: 'weekly',
  subscription_expires_at: '2024-12-31T23:59:59Z',
  streak_count: 12,
  total_words_added: 300,
  total_words_mastered: 150,
}

// Mock notebook
export const mockNotebooks: NotebookWithStats[] = [
  {
    id: 'notebook-1',
    user_id: 'mock-user-id',
    title: 'Spanish Essentials',
    language: 'Spanish',
    language_code: 'es',
    notebook_level: 'bronze',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    words_per_day: 20,
    review_interval_days: 14,
    total_words: 300,
    mastered_words: 150,
    is_active: true,
    pendingReviews: 30,
    todaysTarget: 20,
    completedToday: false,
    currentStreak: 12,
    weeklyProgress: 85,
  }
]

// Generate 15 pages
export const mockPages: PageWithWords[] = Array.from({ length: 15 }, (_, index) => {
  const pageNumber = index + 1
  const isCompleted = pageNumber <= 10 // First 10 pages are completed
  
  // Make pages 1-5 ready for review today (set review date to today or past)
  let reviewDate = null
  if (isCompleted) {
    if (pageNumber <= 5) {
      // These pages are due for review today or overdue
      const today = new Date()
      today.setDate(today.getDate() - (pageNumber - 1)) // Some are overdue
      reviewDate = today.toISOString().split('T')[0]
    } else {
      // These pages are not due yet
      reviewDate = `2024-02-${String(pageNumber).padStart(2, '0')}`
    }
  }
  
  return {
    id: `page-${pageNumber}`,
    notebook_id: 'notebook-1',
    page_number: pageNumber,
    date_created: `2024-01-${String(pageNumber).padStart(2, '0')}`,
    target_round: Math.min(Math.floor((pageNumber - 1) / 5) + 1, 4) as 1 | 2 | 3 | 4,
    words_count: 20,
    is_completed: isCompleted,
    next_review_date: reviewDate,
    words: [],
    notebook: mockNotebooks[0],
  }
})

// Spanish vocabulary words for 15 pages (20 words each = 300 total)
const spanishVocabulary = [
  // Page 1 - Basic nouns
  { word: 'casa', meaning: 'house', notes: 'Basic noun' },
  { word: 'agua', meaning: 'water', notes: 'Feminine noun ending in -a' },
  { word: 'tiempo', meaning: 'time/weather', notes: 'Multiple meanings' },
  { word: 'año', meaning: 'year', notes: 'Note the ñ' },
  { word: 'día', meaning: 'day', notes: 'Masculine despite -a ending' },
  { word: 'hombre', meaning: 'man', notes: 'Masculine noun' },
  { word: 'mujer', meaning: 'woman', notes: 'Feminine noun' },
  { word: 'niño', meaning: 'boy/child', notes: 'Can refer to children generally' },
  { word: 'trabajo', meaning: 'work', notes: 'Common noun' },
  { word: 'vida', meaning: 'life', notes: 'Abstract concept' },
  { word: 'mundo', meaning: 'world', notes: 'Planet Earth' },
  { word: 'país', meaning: 'country', notes: 'Geographic term' },
  { word: 'momento', meaning: 'moment', notes: 'Time period' },
  { word: 'lugar', meaning: 'place', notes: 'Location' },
  { word: 'caso', meaning: 'case', notes: 'Situation or instance' },
  { word: 'parte', meaning: 'part', notes: 'Portion or section' },
  { word: 'grupo', meaning: 'group', notes: 'Collection of people/things' },
  { word: 'problema', meaning: 'problem', notes: 'Masculine despite -a ending' },
  { word: 'punto', meaning: 'point', notes: 'Dot or important matter' },
  { word: 'mano', meaning: 'hand', notes: 'Feminine despite -o ending' },

  // Page 2 - Verbs (infinitive)
  { word: 'ser', meaning: 'to be', notes: 'Permanent states' },
  { word: 'estar', meaning: 'to be', notes: 'Temporary states/location' },
  { word: 'tener', meaning: 'to have', notes: 'Possession' },
  { word: 'hacer', meaning: 'to do/make', notes: 'Very common verb' },
  { word: 'decir', meaning: 'to say/tell', notes: 'Communication' },
  { word: 'ir', meaning: 'to go', notes: 'Movement' },
  { word: 'ver', meaning: 'to see', notes: 'Vision' },
  { word: 'dar', meaning: 'to give', notes: 'Transfer action' },
  { word: 'saber', meaning: 'to know', notes: 'Knowledge of facts' },
  { word: 'querer', meaning: 'to want/love', notes: 'Desire or affection' },
  { word: 'llegar', meaning: 'to arrive', notes: 'Reaching destination' },
  { word: 'pasar', meaning: 'to pass/happen', notes: 'Multiple meanings' },
  { word: 'deber', meaning: 'to owe/should', notes: 'Obligation' },
  { word: 'poner', meaning: 'to put/place', notes: 'Positioning' },
  { word: 'parecer', meaning: 'to seem', notes: 'Appearance' },
  { word: 'quedar', meaning: 'to stay/remain', notes: 'Position' },
  { word: 'creer', meaning: 'to believe', notes: 'Opinion/faith' },
  { word: 'hablar', meaning: 'to speak', notes: 'Communication' },
  { word: 'llevar', meaning: 'to carry/wear', notes: 'Transport/clothing' },
  { word: 'dejar', meaning: 'to leave/let', notes: 'Permission/abandonment' },

  // Page 3 - Adjectives
  { word: 'grande', meaning: 'big/great', notes: 'Size or importance' },
  { word: 'pequeño', meaning: 'small', notes: 'Size' },
  { word: 'bueno', meaning: 'good', notes: 'Quality' },
  { word: 'malo', meaning: 'bad', notes: 'Poor quality' },
  { word: 'nuevo', meaning: 'new', notes: 'Recently made' },
  { word: 'viejo', meaning: 'old', notes: 'Age' },
  { word: 'joven', meaning: 'young', notes: 'Youth' },
  { word: 'importante', meaning: 'important', notes: 'Significance' },
  { word: 'largo', meaning: 'long', notes: 'Length' },
  { word: 'alto', meaning: 'tall/high', notes: 'Height' },
  { word: 'bajo', meaning: 'short/low', notes: 'Height' },
  { word: 'difícil', meaning: 'difficult', notes: 'Challenge level' },
  { word: 'fácil', meaning: 'easy', notes: 'Simplicity' },
  { word: 'posible', meaning: 'possible', notes: 'Feasibility' },
  { word: 'imposible', meaning: 'impossible', notes: 'Unfeasible' },
  { word: 'diferente', meaning: 'different', notes: 'Variety' },
  { word: 'igual', meaning: 'same/equal', notes: 'Similarity' },
  { word: 'blanco', meaning: 'white', notes: 'Color' },
  { word: 'negro', meaning: 'black', notes: 'Color' },
  { word: 'rojo', meaning: 'red', notes: 'Color' },

  // Page 4 - Family & People
  { word: 'familia', meaning: 'family', notes: 'Relatives' },
  { word: 'padre', meaning: 'father', notes: 'Male parent' },
  { word: 'madre', meaning: 'mother', notes: 'Female parent' },
  { word: 'hijo', meaning: 'son', notes: 'Male child' },
  { word: 'hija', meaning: 'daughter', notes: 'Female child' },
  { word: 'hermano', meaning: 'brother', notes: 'Male sibling' },
  { word: 'hermana', meaning: 'sister', notes: 'Female sibling' },
  { word: 'abuelo', meaning: 'grandfather', notes: 'Male grandparent' },
  { word: 'abuela', meaning: 'grandmother', notes: 'Female grandparent' },
  { word: 'primo', meaning: 'cousin (male)', notes: 'Male cousin' },
  { word: 'prima', meaning: 'cousin (female)', notes: 'Female cousin' },
  { word: 'tío', meaning: 'uncle', notes: 'Brother of parent' },
  { word: 'tía', meaning: 'aunt', notes: 'Sister of parent' },
  { word: 'amigo', meaning: 'friend (male)', notes: 'Male friend' },
  { word: 'amiga', meaning: 'friend (female)', notes: 'Female friend' },
  { word: 'esposo', meaning: 'husband', notes: 'Male spouse' },
  { word: 'esposa', meaning: 'wife', notes: 'Female spouse' },
  { word: 'novio', meaning: 'boyfriend', notes: 'Male romantic partner' },
  { word: 'novia', meaning: 'girlfriend', notes: 'Female romantic partner' },
  { word: 'bebé', meaning: 'baby', notes: 'Infant' },

  // Page 5 - Food & Drink
  { word: 'comida', meaning: 'food', notes: 'General term' },
  { word: 'desayuno', meaning: 'breakfast', notes: 'Morning meal' },
  { word: 'almuerzo', meaning: 'lunch', notes: 'Midday meal' },
  { word: 'cena', meaning: 'dinner', notes: 'Evening meal' },
  { word: 'pan', meaning: 'bread', notes: 'Staple food' },
  { word: 'leche', meaning: 'milk', notes: 'Dairy product' },
  { word: 'café', meaning: 'coffee', notes: 'Hot beverage' },
  { word: 'té', meaning: 'tea', notes: 'Hot beverage' },
  { word: 'cerveza', meaning: 'beer', notes: 'Alcoholic beverage' },
  { word: 'vino', meaning: 'wine', notes: 'Alcoholic beverage' },
  { word: 'carne', meaning: 'meat', notes: 'Protein' },
  { word: 'pollo', meaning: 'chicken', notes: 'Type of meat' },
  { word: 'pescado', meaning: 'fish', notes: 'Seafood' },
  { word: 'arroz', meaning: 'rice', notes: 'Grain' },
  { word: 'pasta', meaning: 'pasta', notes: 'Italian food' },
  { word: 'fruta', meaning: 'fruit', notes: 'Sweet produce' },
  { word: 'verdura', meaning: 'vegetable', notes: 'Green produce' },
  { word: 'ensalada', meaning: 'salad', notes: 'Raw vegetables' },
  { word: 'sopa', meaning: 'soup', notes: 'Liquid food' },
  { word: 'postre', meaning: 'dessert', notes: 'Sweet ending' },

  // Page 6 - House & Home
  { word: 'habitación', meaning: 'room', notes: 'Space in house' },
  { word: 'cocina', meaning: 'kitchen', notes: 'Cooking area' },
  { word: 'baño', meaning: 'bathroom', notes: 'Hygiene room' },
  { word: 'dormitorio', meaning: 'bedroom', notes: 'Sleeping room' },
  { word: 'sala', meaning: 'living room', notes: 'Common area' },
  { word: 'jardín', meaning: 'garden', notes: 'Outdoor plants' },
  { word: 'puerta', meaning: 'door', notes: 'Entrance/exit' },
  { word: 'ventana', meaning: 'window', notes: 'Glass opening' },
  { word: 'mesa', meaning: 'table', notes: 'Furniture' },
  { word: 'silla', meaning: 'chair', notes: 'Seating' },
  { word: 'cama', meaning: 'bed', notes: 'Sleeping furniture' },
  { word: 'sofá', meaning: 'sofa', notes: 'Couch' },
  { word: 'televisión', meaning: 'television', notes: 'TV set' },
  { word: 'teléfono', meaning: 'telephone', notes: 'Communication device' },
  { word: 'computadora', meaning: 'computer', notes: 'Technology' },
  { word: 'libro', meaning: 'book', notes: 'Reading material' },
  { word: 'espejo', meaning: 'mirror', notes: 'Reflective surface' },
  { word: 'lámpara', meaning: 'lamp', notes: 'Light source' },
  { word: 'alfombra', meaning: 'carpet', notes: 'Floor covering' },
  { word: 'pared', meaning: 'wall', notes: 'Room boundary' },

  // Page 7 - Transportation
  { word: 'coche', meaning: 'car', notes: 'Vehicle' },
  { word: 'autobús', meaning: 'bus', notes: 'Public transport' },
  { word: 'tren', meaning: 'train', notes: 'Rail transport' },
  { word: 'avión', meaning: 'airplane', notes: 'Air transport' },
  { word: 'bicicleta', meaning: 'bicycle', notes: 'Two wheels' },
  { word: 'motocicleta', meaning: 'motorcycle', notes: 'Motor bike' },
  { word: 'barco', meaning: 'boat/ship', notes: 'Water transport' },
  { word: 'taxi', meaning: 'taxi', notes: 'Hired car' },
  { word: 'metro', meaning: 'subway', notes: 'Underground train' },
  { word: 'estación', meaning: 'station', notes: 'Transport hub' },
  { word: 'aeropuerto', meaning: 'airport', notes: 'Air terminal' },
  { word: 'hospital', meaning: 'hospital', notes: 'Medical center' },
  { word: 'escuela', meaning: 'school', notes: 'Educational institution' },
  { word: 'universidad', meaning: 'university', notes: 'Higher education' },
  { word: 'biblioteca', meaning: 'library', notes: 'Book repository' },
  { word: 'supermercado', meaning: 'supermarket', notes: 'Large store' },
  { word: 'farmacia', meaning: 'pharmacy', notes: 'Medicine store' },
  { word: 'banco', meaning: 'bank', notes: 'Financial institution' },
  { word: 'restaurante', meaning: 'restaurant', notes: 'Dining establishment' },
  { word: 'hotel', meaning: 'hotel', notes: 'Accommodation' },

  // Page 8 - Time & Weather
  { word: 'hora', meaning: 'hour/time', notes: 'Time unit' },
  { word: 'minuto', meaning: 'minute', notes: 'Time unit' },
  { word: 'segundo', meaning: 'second', notes: 'Time unit' },
  { word: 'mañana', meaning: 'morning/tomorrow', notes: 'Time period' },
  { word: 'tarde', meaning: 'afternoon/late', notes: 'Time period' },
  { word: 'noche', meaning: 'night', notes: 'Time period' },
  { word: 'hoy', meaning: 'today', notes: 'Current day' },
  { word: 'ayer', meaning: 'yesterday', notes: 'Previous day' },
  { word: 'semana', meaning: 'week', notes: 'Seven days' },
  { word: 'mes', meaning: 'month', notes: 'Calendar period' },
  { word: 'clima', meaning: 'weather/climate', notes: 'Atmospheric conditions' },
  { word: 'sol', meaning: 'sun', notes: 'Star' },
  { word: 'luna', meaning: 'moon', notes: 'Satellite' },
  { word: 'lluvia', meaning: 'rain', notes: 'Precipitation' },
  { word: 'nieve', meaning: 'snow', notes: 'Frozen precipitation' },
  { word: 'viento', meaning: 'wind', notes: 'Air movement' },
  { word: 'calor', meaning: 'heat', notes: 'High temperature' },
  { word: 'frío', meaning: 'cold', notes: 'Low temperature' },
  { word: 'temperatura', meaning: 'temperature', notes: 'Thermal measure' },
  { word: 'estación', meaning: 'season', notes: 'Time of year' },

  // Page 9 - Body & Health
  { word: 'cuerpo', meaning: 'body', notes: 'Physical form' },
  { word: 'cabeza', meaning: 'head', notes: 'Top body part' },
  { word: 'cara', meaning: 'face', notes: 'Front of head' },
  { word: 'ojo', meaning: 'eye', notes: 'Vision organ' },
  { word: 'oreja', meaning: 'ear', notes: 'Hearing organ' },
  { word: 'nariz', meaning: 'nose', notes: 'Smell organ' },
  { word: 'boca', meaning: 'mouth', notes: 'Eating/speaking organ' },
  { word: 'diente', meaning: 'tooth', notes: 'Chewing tool' },
  { word: 'cuello', meaning: 'neck', notes: 'Head connector' },
  { word: 'brazo', meaning: 'arm', notes: 'Upper limb' },
  { word: 'pierna', meaning: 'leg', notes: 'Lower limb' },
  { word: 'pie', meaning: 'foot', notes: 'Walking tool' },
  { word: 'espalda', meaning: 'back', notes: 'Rear torso' },
  { word: 'estómago', meaning: 'stomach', notes: 'Digestive organ' },
  { word: 'corazón', meaning: 'heart', notes: 'Circulatory organ' },
  { word: 'sangre', meaning: 'blood', notes: 'Circulatory fluid' },
  { word: 'dolor', meaning: 'pain', notes: 'Physical discomfort' },
  { word: 'enfermedad', meaning: 'illness', notes: 'Health condition' },
  { word: 'medicina', meaning: 'medicine', notes: 'Treatment' },
  { word: 'salud', meaning: 'health', notes: 'Well-being' },

  // Page 10 - Emotions & Feelings
  { word: 'amor', meaning: 'love', notes: 'Deep affection' },
  { word: 'felicidad', meaning: 'happiness', notes: 'Joy emotion' },
  { word: 'tristeza', meaning: 'sadness', notes: 'Sorrow emotion' },
  { word: 'miedo', meaning: 'fear', notes: 'Scared emotion' },
  { word: 'ira', meaning: 'anger', notes: 'Mad emotion' },
  { word: 'sorpresa', meaning: 'surprise', notes: 'Unexpected feeling' },
  { word: 'esperanza', meaning: 'hope', notes: 'Positive expectation' },
  { word: 'preocupación', meaning: 'worry', notes: 'Anxious feeling' },
  { word: 'emoción', meaning: 'emotion', notes: 'Feeling state' },
  { word: 'sentimiento', meaning: 'feeling', notes: 'Emotional state' },
  { word: 'alegría', meaning: 'joy', notes: 'Happiness' },
  { word: 'paz', meaning: 'peace', notes: 'Calm state' },
  { word: 'estrés', meaning: 'stress', notes: 'Tension' },
  { word: 'calma', meaning: 'calm', notes: 'Peaceful state' },
  { word: 'nervioso', meaning: 'nervous', notes: 'Anxious state' },
  { word: 'relajado', meaning: 'relaxed', notes: 'Calm state' },
  { word: 'cansado', meaning: 'tired', notes: 'Fatigue state' },
  { word: 'energía', meaning: 'energy', notes: 'Vitality' },
  { word: 'confianza', meaning: 'confidence', notes: 'Self-assurance' },
  { word: 'duda', meaning: 'doubt', notes: 'Uncertainty' },

  // Page 11 - Technology
  { word: 'tecnología', meaning: 'technology', notes: 'Modern tools' },
  { word: 'internet', meaning: 'internet', notes: 'Global network' },
  { word: 'correo', meaning: 'email/mail', notes: 'Electronic message' },
  { word: 'mensaje', meaning: 'message', notes: 'Communication' },
  { word: 'aplicación', meaning: 'application', notes: 'Software program' },
  { word: 'programa', meaning: 'program', notes: 'Software' },
  { word: 'sitio', meaning: 'site/website', notes: 'Online location' },
  { word: 'página', meaning: 'page', notes: 'Web/book page' },
  { word: 'pantalla', meaning: 'screen', notes: 'Display surface' },
  { word: 'teclado', meaning: 'keyboard', notes: 'Input device' },
  { word: 'ratón', meaning: 'mouse', notes: 'Computer pointer' },
  { word: 'cámara', meaning: 'camera', notes: 'Photo device' },
  { word: 'foto', meaning: 'photo', notes: 'Picture' },
  { word: 'video', meaning: 'video', notes: 'Moving pictures' },
  { word: 'música', meaning: 'music', notes: 'Audio art' },
  { word: 'sonido', meaning: 'sound', notes: 'Audio' },
  { word: 'archivo', meaning: 'file', notes: 'Digital document' },
  { word: 'documento', meaning: 'document', notes: 'Written material' },
  { word: 'contraseña', meaning: 'password', notes: 'Security code' },
  { word: 'usuario', meaning: 'user', notes: 'System operator' },

  // Page 12 - Education & Work
  { word: 'educación', meaning: 'education', notes: 'Learning process' },
  { word: 'estudiante', meaning: 'student', notes: 'Learner' },
  { word: 'profesor', meaning: 'teacher', notes: 'Educator' },
  { word: 'clase', meaning: 'class', notes: 'Learning session' },
  { word: 'lección', meaning: 'lesson', notes: 'Teaching unit' },
  { word: 'tarea', meaning: 'homework', notes: 'Assignment' },
  { word: 'examen', meaning: 'exam', notes: 'Test' },
  { word: 'nota', meaning: 'grade/note', notes: 'Score or annotation' },
  { word: 'título', meaning: 'title/degree', notes: 'Academic credential' },
  { word: 'carrera', meaning: 'career/race', notes: 'Professional path' },
  { word: 'empleo', meaning: 'employment', notes: 'Job' },
  { word: 'oficina', meaning: 'office', notes: 'Workplace' },
  { word: 'jefe', meaning: 'boss', notes: 'Supervisor' },
  { word: 'empleado', meaning: 'employee', notes: 'Worker' },
  { word: 'reunión', meaning: 'meeting', notes: 'Work gathering' },
  { word: 'proyecto', meaning: 'project', notes: 'Work assignment' },
  { word: 'cliente', meaning: 'client', notes: 'Customer' },
  { word: 'empresa', meaning: 'company', notes: 'Business organization' },
  { word: 'negocio', meaning: 'business', notes: 'Commercial activity' },
  { word: 'dinero', meaning: 'money', notes: 'Currency' },

  // Page 13 - Sports & Activities
  { word: 'deporte', meaning: 'sport', notes: 'Physical activity' },
  { word: 'fútbol', meaning: 'soccer', notes: 'Popular sport' },
  { word: 'básquetbol', meaning: 'basketball', notes: 'Ball sport' },
  { word: 'tenis', meaning: 'tennis', notes: 'Racket sport' },
  { word: 'natación', meaning: 'swimming', notes: 'Water sport' },
  { word: 'correr', meaning: 'to run', notes: 'Exercise activity' },
  { word: 'caminar', meaning: 'to walk', notes: 'Movement' },
  { word: 'jugar', meaning: 'to play', notes: 'Game activity' },
  { word: 'juego', meaning: 'game', notes: 'Entertainment' },
  { word: 'partido', meaning: 'match/game', notes: 'Sports competition' },
  { word: 'equipo', meaning: 'team', notes: 'Group of players' },
  { word: 'pelota', meaning: 'ball', notes: 'Sports equipment' },
  { word: 'ejercicio', meaning: 'exercise', notes: 'Physical activity' },
  { word: 'gimnasio', meaning: 'gym', notes: 'Exercise facility' },
  { word: 'parque', meaning: 'park', notes: 'Public green space' },
  { word: 'playa', meaning: 'beach', notes: 'Coastal area' },
  { word: 'montaña', meaning: 'mountain', notes: 'High landform' },
  { word: 'río', meaning: 'river', notes: 'Water body' },
  { word: 'lago', meaning: 'lake', notes: 'Water body' },
  { word: 'bosque', meaning: 'forest', notes: 'Tree area' },

  // Page 14 - Shopping & Money
  { word: 'tienda', meaning: 'store', notes: 'Shopping place' },
  { word: 'comprar', meaning: 'to buy', notes: 'Purchase action' },
  { word: 'vender', meaning: 'to sell', notes: 'Sale action' },
  { word: 'precio', meaning: 'price', notes: 'Cost amount' },
  { word: 'caro', meaning: 'expensive', notes: 'High cost' },
  { word: 'barato', meaning: 'cheap', notes: 'Low cost' },
  { word: 'regalo', meaning: 'gift', notes: 'Present' },
  { word: 'tarjeta', meaning: 'card', notes: 'Payment method' },
  { word: 'efectivo', meaning: 'cash', notes: 'Physical money' },
  { word: 'cuenta', meaning: 'account/bill', notes: 'Financial record' },
  { word: 'descuento', meaning: 'discount', notes: 'Price reduction' },
  { word: 'oferta', meaning: 'offer/sale', notes: 'Special deal' },
  { word: 'mercado', meaning: 'market', notes: 'Trading place' },
  { word: 'centro', meaning: 'center', notes: 'Central location' },
  { word: 'vendedor', meaning: 'seller', notes: 'Sales person' },
  { word: 'cliente', meaning: 'customer', notes: 'Buyer' },
  { word: 'producto', meaning: 'product', notes: 'Item for sale' },
  { word: 'calidad', meaning: 'quality', notes: 'Standard level' },
  { word: 'marca', meaning: 'brand', notes: 'Product label' },
  { word: 'tamaño', meaning: 'size', notes: 'Dimension' },

  // Page 15 - Nature & Environment
  { word: 'naturaleza', meaning: 'nature', notes: 'Natural world' },
  { word: 'animal', meaning: 'animal', notes: 'Living creature' },
  { word: 'perro', meaning: 'dog', notes: 'Pet animal' },
  { word: 'gato', meaning: 'cat', notes: 'Pet animal' },
  { word: 'pájaro', meaning: 'bird', notes: 'Flying animal' },
  { word: 'pez', meaning: 'fish', notes: 'Water animal' },
  { word: 'árbol', meaning: 'tree', notes: 'Large plant' },
  { word: 'flor', meaning: 'flower', notes: 'Plant bloom' },
  { word: 'hierba', meaning: 'grass', notes: 'Ground cover' },
  { word: 'hoja', meaning: 'leaf', notes: 'Tree part' },
  { word: 'tierra', meaning: 'earth/soil', notes: 'Ground material' },
  { word: 'aire', meaning: 'air', notes: 'Atmosphere' },
  { word: 'fuego', meaning: 'fire', notes: 'Combustion' },
  { word: 'mar', meaning: 'sea', notes: 'Large water body' },
  { word: 'océano', meaning: 'ocean', notes: 'Largest water body' },
  { word: 'isla', meaning: 'island', notes: 'Land surrounded by water' },
  { word: 'desierto', meaning: 'desert', notes: 'Dry land' },
  { word: 'cielo', meaning: 'sky', notes: 'Atmosphere above' },
  { word: 'estrella', meaning: 'star', notes: 'Celestial body' },
  { word: 'planeta', meaning: 'planet', notes: 'Celestial body' }
]

// Generate words for all pages
export const mockWordsForReview: WordWithReviews[] = spanishVocabulary.map((vocab, index) => {
  const pageNumber = Math.floor(index / 20) + 1
  const positionInPage = (index % 20) + 1
  const pageId = `page-${pageNumber}`
  
  // Determine word status based on page completion
  const isPageCompleted = pageNumber <= 10
  const randomFactor = Math.random()
  let status: 'learning' | 'mastered' | 'failed'
  
  if (isPageCompleted) {
    // For completed pages, most words should be mastered
    if (randomFactor < 0.7) {
      status = 'mastered'
    } else if (randomFactor < 0.95) {
      status = 'learning'
    } else {
      status = 'failed'
    }
  } else {
    // For incomplete pages, words are still learning
    status = 'learning'
  }
  
  return {
    id: `word-${index + 1}`,
    page_id: pageId,
    word: vocab.word,
    meaning: vocab.meaning,
    notes: vocab.notes,
    image_url: null,
    current_round: Math.min(Math.floor(Math.random() * 3) + 1, 4) as 1 | 2 | 3 | 4,
    status,
    created_at: `2024-01-${String(pageNumber).padStart(2, '0')}T10:00:00Z`,
    updated_at: `2024-01-${String(pageNumber).padStart(2, '0')}T10:00:00Z`,
    position_in_page: positionInPage,
    reviews: [],
    page: mockPages[pageNumber - 1],
    nextReviewDate: isPageCompleted ? new Date(`2024-01-${pageNumber + 14}`) : new Date('2024-01-30'),
    daysSinceCreated: pageNumber,
    isReadyForReview: isPageCompleted && status !== 'mastered' && pageNumber <= 5,
  }
})

// Mock input session words (for current session)
export const mockInputWords = [
  { word: 'ejemplo', meaning: 'example', notes: 'Sample or instance' },
  { word: 'práctica', meaning: 'practice', notes: 'Exercise or rehearsal' },
  { word: 'estudio', meaning: 'study', notes: 'Learning activity' },
]

// Language options for notebook creation
export const languageOptions = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
]

// Mock service functions
export const mockDataService = {
  // Simulate async operations with delays
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Profile operations
  async getProfile(): Promise<Tables<'profiles'>> {
    await this.delay(500)
    return mockProfile
  },

  async updateProfile(updates: Partial<Tables<'profiles'>>): Promise<Tables<'profiles'>> {
    await this.delay(300)
    return { ...mockProfile, ...updates }
  },

  // Notebook operations
  async getNotebooks(): Promise<NotebookWithStats[]> {
    await this.delay(800)
    return mockNotebooks
  },

  async createNotebook(data: {
    title: string
    language: string
    language_code: string
    words_per_day?: number
  }): Promise<NotebookWithStats> {
    await this.delay(600)
    const newNotebook: NotebookWithStats = {
      id: `notebook-${Date.now()}`,
      user_id: 'mock-user-id',
      title: data.title,
      language: data.language,
      language_code: data.language_code,
      notebook_level: 'bronze',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      words_per_day: data.words_per_day || 20,
      review_interval_days: 14,
      total_words: 0,
      mastered_words: 0,
      is_active: true,
      pendingReviews: 0,
      todaysTarget: data.words_per_day || 20,
      completedToday: false,
      currentStreak: 0,
      weeklyProgress: 0,
    }
    mockNotebooks.push(newNotebook)
    return newNotebook
  },

  async getNotebook(id: string): Promise<NotebookWithStats | null> {
    await this.delay(400)
    return mockNotebooks.find(n => n.id === id) || null
  },

  // Page operations
  async getPages(notebookId: string): Promise<PageWithWords[]> {
    await this.delay(600)
    return mockPages.filter(p => p.notebook_id === notebookId)
  },

  async createPage(notebookId: string): Promise<PageWithWords> {
    await this.delay(400)
    const existingPages = mockPages.filter(p => p.notebook_id === notebookId)
    const pageNumber = existingPages.length + 1
    
    const newPage: PageWithWords = {
      id: `page-${Date.now()}`,
      notebook_id: notebookId,
      page_number: pageNumber,
      date_created: new Date().toISOString().split('T')[0],
      target_round: 1,
      words_count: 0,
      is_completed: false,
      next_review_date: null,
      words: [],
      notebook: mockNotebooks.find(n => n.id === notebookId)!,
    }
    mockPages.push(newPage)
    return newPage
  },

  // Word operations
  async addWords(pageId: string, words: Array<{
    word: string
    meaning: string
    notes?: string
    position_in_page: number
  }>): Promise<Tables<'words'>[]> {
    await this.delay(800)
    
    const newWords: Tables<'words'>[] = words.map((word, index) => ({
      id: `word-${Date.now()}-${index}`,
      page_id: pageId,
      word: word.word,
      meaning: word.meaning,
      notes: word.notes || null,
      image_url: null,
      current_round: 1,
      status: 'learning' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      position_in_page: word.position_in_page,
    }))

    // Update page completion
    const page = mockPages.find(p => p.id === pageId)
    if (page) {
      page.words_count = words.length
      page.is_completed = true
      const reviewDate = new Date()
      reviewDate.setDate(reviewDate.getDate() + 14)
      page.next_review_date = reviewDate.toISOString().split('T')[0]
    }

    return newWords
  },

  async getWordsForReview(notebookId: string): Promise<WordWithReviews[]> {
    await this.delay(700)
    const today = new Date().toISOString().split('T')[0]
    return mockWordsForReview.filter(w => 
      w.page.notebook.id === notebookId && 
      w.isReadyForReview &&
      w.page.next_review_date &&
      w.page.next_review_date <= today
    )
  },

  async getWordsForNotebook(notebookId: string): Promise<WordWithReviews[]> {
    await this.delay(500)
    return mockWordsForReview.filter(w => w.page.notebook.id === notebookId)
  },

  async processWordReview(wordId: string, remembered: boolean): Promise<{
    success: boolean
    newStatus: 'learning' | 'mastered' | 'failed'
    newRound: number
  }> {
    await this.delay(300)
    
    const word = mockWordsForReview.find(w => w.id === wordId)
    if (!word) {
      throw new Error('Word not found')
    }

    if (remembered) {
      word.status = 'mastered'
      return {
        success: true,
        newStatus: 'mastered',
        newRound: word.current_round
      }
    } else {
      const newRound = Math.min(word.current_round + 1, 4)
      word.current_round = newRound
      
      if (newRound >= 4) {
        word.status = 'failed'
        return {
          success: true,
          newStatus: 'failed',
          newRound
        }
      } else {
        return {
          success: true,
          newStatus: 'learning',
          newRound
        }
      }
    }
  },

  // Analytics mock data
  async getDailyProgress(days: number = 30): Promise<Array<{
    date: string
    wordsAdded: number
    wordsReviewed: number
    accuracy: number
  }>> {
    await this.delay(600)
    
    const data = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      data.push({
        date: date.toISOString().split('T')[0],
        wordsAdded: Math.floor(Math.random() * 25) + 5,
        wordsReviewed: Math.floor(Math.random() * 30) + 10,
        accuracy: Math.floor(Math.random() * 20) + 70, // 70-90% accuracy
      })
    }
    
    return data
  },

  async getWeeklyStats(): Promise<{
    totalWordsAdded: number
    totalWordsReviewed: number
    averageAccuracy: number
    streakDays: number
  }> {
    await this.delay(400)
    
    return {
      totalWordsAdded: 140,
      totalWordsReviewed: 200,
      averageAccuracy: 85,
      streakDays: 12,
    }
  }
}