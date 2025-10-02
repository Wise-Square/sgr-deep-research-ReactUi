/**
 * ПРОСТОЙ ПАРСЕР
 * ВСЕ от сервера → спойлер
 * QUESTIONS → дублируются в основной текст
 */

export interface ParseResult {
  mainText: string;
  spoilerText?: string;
  spoilerTitle?: string;
  searchResultsSpoiler?: string;
  searchResultsTitle?: string;
}

export function parseMessage(messageContent: string, questions?: string): ParseResult {
  
  // Если контент пустой
  if (!messageContent.trim()) {
    return {
      mainText: questions || "Обрабатываю запрос...",
      spoilerText: undefined,
      spoilerTitle: undefined
    };
  }
  
  // Если контент уже содержит отформатированный спойлер
  const spoilerMatch = messageContent.match(/^~~\{([^}]+)\}~~\n(.*)$/s);
  if (spoilerMatch) {
    
    // Ищем title в function
    const titleMatch = messageContent.match(/- Title: ([^-\n]+)/);
    let mainText = '';
    
    if (titleMatch) {
      mainText = `# ${titleMatch[1].trim()}`;
    }
    
    // Ищем content в function
    const contentMatch = messageContent.match(/- Content: ([^-\n]+(?:[^-\n]*\n[^-\n]+)*)/);
    if (contentMatch) {
      const content = contentMatch[1].trim();
      if (mainText) {
        mainText += '\n\n' + content;
      } else {
        mainText = content;
      }
    }
    
    // Если нет title/content, ищем questions
    if (!mainText) {
      const questionsMatch = messageContent.match(/- Questions: ([^-\n]+(?:[^-\n]*\n[^-\n]+)*)/);
      
      if (questionsMatch) {
        // Извлекаем questions и форматируем их
        const questionsText = questionsMatch[1].trim();
        const questionsArray = questionsText.split(',').map(q => q.trim());
        mainText = questionsArray.join('\n');
      }
    }
    
    // Если questions не найдены, ищем их в конце контента
    if (!mainText) {
      const endMatch = messageContent.match(/\n\n([A-Za-z].*)$/s);
      if (endMatch) {
        mainText = endMatch[1];
      }
    }
    
    // Убираем questions из спойлера, если они есть
    let spoilerText = spoilerMatch[2];
    if (mainText) {
      // Убираем questions из конца спойлера
      spoilerText = spoilerText.replace(/\n\nWhat specific information.*$/s, '');
    }
    
    return {
      mainText: mainText,
      spoilerText: spoilerText,
      spoilerTitle: spoilerMatch[1]
    };
  }
  
  // ВСЕ от сервера идет в спойлер
  let spoilerContent = messageContent;
  
  // Проверяем, есть ли результаты поиска
  const searchResultsMatch = messageContent.match(/^([^:\n]+)\n\d{2}:\d{2}\nSearch Results:(.*)$/s);
  if (searchResultsMatch) {
    const title = searchResultsMatch[1].trim();
    const searchResults = searchResultsMatch[2].trim();
    
    // Основной текст - только заголовок
    const mainText = `# ${title}`;
    
    // Все результаты поиска идут в спойлер
    const spoilerContent = `**Результаты поиска:**\n${searchResults}`;
    
    return {
      mainText: mainText,
      spoilerText: spoilerContent,
      spoilerTitle: "Результаты поиска"
    };
  }
  
  // Если это JSON, форматируем его
  if (messageContent.startsWith('{')) {
    try {
      const jsonData = JSON.parse(messageContent);
      spoilerContent = formatJSONForSpoiler(jsonData);
    } catch (e) {
      // Пытаемся автозакрыть скобки и кавычки
      const autoClosedJSON = autoCloseJSON(messageContent);
      try {
        const jsonData = JSON.parse(autoClosedJSON);
        spoilerContent = formatJSONForSpoiler(jsonData);
      } catch (e2) {
        spoilerContent = messageContent;
      }
    }
  }
  
  // Если есть questions, добавляем их к спойлеру
  if (questions && questions.trim()) {
    spoilerContent += '\n\n**Questions:**\n' + questions.trim();
  }
  
  // Извлекаем определенные поля для основного текста
  let mainText = "Обрабатываю запрос...";
  
  if (messageContent.startsWith('{')) {
    try {
      const jsonData = JSON.parse(messageContent);
      let mainContentParts = [];
      
      // Добавляем questions если есть (переданные отдельно)
      if (questions && questions.trim()) {
        mainContentParts.push(questions.trim());
      }
      
      // Добавляем function.questions если есть (из JSON)
      if (jsonData.function?.questions) {
        const functionQuestions = jsonData.function.questions.join('\n');
        if (functionQuestions.trim()) {
          mainContentParts.push(functionQuestions.trim());
        }
      }
      
      // Добавляем function.title если есть (из JSON)
      if (jsonData.function?.title) {
        mainContentParts.push(`# ${jsonData.function.title}`);
      }
      
      // Добавляем function.content если есть (из JSON) - это отчет
      if (jsonData.function?.content) {
        mainContentParts.push(jsonData.function.content);
      }
      
      // Специальная обработка для agentcompletiontool
      if (jsonData.function?.tool_name_discriminator === 'agentcompletiontool') {
        // Используем current_situation как заголовок, если нет title
        if (!jsonData.function?.title && jsonData.current_situation) {
          mainContentParts.push(`# ${jsonData.current_situation}`);
        }
        
        // Используем function.reasoning как основной контент, если нет content
        if (!jsonData.function?.content && jsonData.function?.reasoning) {
          mainContentParts.push(jsonData.function.reasoning);
        }
      }
      
      // Специальная обработка для createreporttool
      if (jsonData.function?.tool_name_discriminator === 'createreporttool') {
        // Используем function.title как заголовок
        if (jsonData.function?.title) {
          mainContentParts.push(`# ${jsonData.function.title}`);
        }
        
        // Используем function.content как основной контент (это сам отчет)
        if (jsonData.function?.content) {
          mainContentParts.push(jsonData.function.content);
        }
      }
      
      // НЕ добавляем current_situation и plan_status в основной текст
      // Они должны быть только в спойлере
      
      // Если есть что показать в основном тексте
      if (mainContentParts.length > 0) {
        mainText = mainContentParts.join('\n\n');
        if (mainText.includes('### Executive Summary')) {
          console.log('🔍 Executive Summary found in mainText:', mainText.substring(0, 200));
        }
      }
      
      
    } catch (e) {
      // Если не удалось распарсить JSON, используем questions или дефолтный текст
      mainText = questions && questions.trim() ? questions.trim() : "Обрабатываю запрос...";
    }
  } else {
    // Если не JSON, используем questions или дефолтный текст
    mainText = questions && questions.trim() ? questions.trim() : "Обрабатываю запрос...";
  }
  
  return {
    mainText: mainText,
    spoilerText: spoilerContent,
    spoilerTitle: "Мысли"
  };
}

/**
 * Форматирует JSON для спойлера
 */
function autoCloseJSON(jsonString: string): string {
  let result = jsonString;
  
  // Подсчитываем открывающие и закрывающие скобки
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') {
        openBraces++;
      } else if (char === '}') {
        openBraces--;
      } else if (char === '[') {
        openBrackets++;
      } else if (char === ']') {
        openBrackets--;
      }
    }
  }
  
  // Закрываем незакрытые кавычки
  if (inString) {
    result += '"';
  }
  
  // Закрываем незакрытые массивы
  while (openBrackets > 0) {
    result += ']';
    openBrackets--;
  }
  
  // Закрываем незакрытые объекты
  while (openBraces > 0) {
    result += '}';
    openBraces--;
  }
  
  
  return result;
}

function formatJSONForSpoiler(jsonData: any): string {
  
  let result = '';
  
  // Reasoning steps
  if (jsonData.reasoning_steps) {
    result += '**Reasoning steps:**\n';
    jsonData.reasoning_steps.forEach((step: string, index: number) => {
      result += `${index + 1}. ${step}\n`;
    });
    result += '\n';
  }
  
  // Current situation
  if (jsonData.current_situation) {
    result += `**Current situation:** ${jsonData.current_situation}\n\n`;
  }
  
  // Plan status
  if (jsonData.plan_status) {
    result += `**Plan status:** ${jsonData.plan_status}\n\n`;
  }
  
  // Remaining steps
  if (jsonData.remaining_steps) {
    result += '**Remaining steps:**\n';
    jsonData.remaining_steps.forEach((step: string, index: number) => {
      result += `${index + 1}. ${step}\n`;
    });
    result += '\n';
  }
  
  // Task completed
  if (jsonData.task_completed !== undefined) {
    result += `**Task completed:** ${jsonData.task_completed}\n\n`;
  }
  
  // Enough data
  if (jsonData.enough_data !== undefined) {
    result += `**Enough data:** ${jsonData.enough_data}\n\n`;
  }
  
  // Function/Tool calls
  if (jsonData.function) {
    result += '**Function:**\n';
    if (jsonData.function.tool_name_discriminator) {
      result += `- Tool: ${jsonData.function.tool_name_discriminator}\n`;
    }
    if (jsonData.function.reasoning) {
      result += `- Reasoning: ${jsonData.function.reasoning}\n`;
    }
    if (jsonData.function.questions) {
      result += `- Questions: ${jsonData.function.questions.join(', ')}\n`;
    }
    if (jsonData.function.unclear_terms) {
      result += `- Unclear terms: ${jsonData.function.unclear_terms.join(', ')}\n`;
    }
    if (jsonData.function.assumptions) {
      result += `- Assumptions: ${jsonData.function.assumptions.join(', ')}\n`;
    }
    
    // Специальная обработка для agentcompletiontool
    if (jsonData.function.tool_name_discriminator === 'agentcompletiontool') {
      if (jsonData.function.completed_steps) {
        result += '**Completed steps:**\n';
        jsonData.function.completed_steps.forEach((step: string, index: number) => {
          result += `${index + 1}. ${step}\n`;
        });
        result += '\n';
      }
      if (jsonData.function.status) {
        result += `- Status: ${jsonData.function.status}\n`;
      }
    }
    
    // НЕ добавляем title и content в спойлер - они идут в основной текст
    result += '\n';
  }
  
  const finalResult = result.trim();
  return finalResult;
}
