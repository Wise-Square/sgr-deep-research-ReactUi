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
      mainText: questions || "",
      spoilerText: undefined,
      spoilerTitle: undefined
    };
  }
  
  // Если контент уже содержит отформатированный спойлер
  const spoilerMatch = messageContent.match(/^~~\{([^}]+)\}~~\n(.*?)(?:\n\n(.*))?$/s);
  if (spoilerMatch) {
    const spoilerTitle = spoilerMatch[1];
    const spoilerText = spoilerMatch[2];
    const mainText = spoilerMatch[3] || '';
    
    
    return {
      mainText: mainText.trim(),
      spoilerText: spoilerText.trim(),
      spoilerTitle: spoilerTitle
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
  let mainText = "";
  
  if (messageContent.startsWith('{')) {
    try {
      const jsonData = JSON.parse(messageContent);
      let mainContentParts = [];
      
      // Добавляем questions если есть (переданные отдельно)
      if (questions && questions.trim()) {
        mainContentParts.push(questions.trim());
      }
      
      // Добавляем function.questions если есть (из JSON) - в основной текст
      if (jsonData.function?.questions && Array.isArray(jsonData.function.questions)) {
        const questionsText = jsonData.function.questions.map((q: string, index: number) => 
          `${index + 1}. ${q}`
        ).join('\n');
        if (questionsText.trim()) {
          mainContentParts.push(questionsText.trim());
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
        }
      }
      
      // Дополнительная проверка: если в JSON есть content с Executive Summary, но он не попал в mainText
      if (!mainText.includes('### Executive Summary') && jsonData.function?.content?.includes('### Executive Summary')) {
        if (mainText && mainText !== "Обрабатываю запрос...") {
          mainText += '\n\n' + jsonData.function.content;
        } else {
          mainText = jsonData.function.content;
        }
      }
      
      
    } catch (e) {
      // Если не удалось распарсить JSON, используем questions или пустой текст
      mainText = questions && questions.trim() ? questions.trim() : "";
    }
  } else {
    // Если не JSON, используем questions или пустой текст
    mainText = questions && questions.trim() ? questions.trim() : "";
  }
  
  return {
    mainText: mainText,
    spoilerText: spoilerContent,
    spoilerTitle: undefined // Заголовок будет установлен в MessageBubble с учетом языка
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
    // НЕ добавляем questions в спойлер - они идут в основной текст
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
