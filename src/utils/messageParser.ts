import type { ParsedJSONData } from './types';

/**
 * Парсит JSON данные и создает читаемый текст (только спойлер во время стриминга)
 */
export const parseJSONToReadableText = (jsonData: ParsedJSONData, isStreamComplete: boolean = false): string => {
  let readableText = '';

  // СПОЙЛЕР ВСЕГДА В САМОМ ВЕРХУ
  const detailsText = buildAllDetailsSection(jsonData);
  if (detailsText) {
    readableText += `~~{Мысли}~~\n${detailsText}\n`;
  }

  // Добавляем основной статус
  readableText += getMainStatusText(jsonData);

  // Добавляем вопросы только после завершения стриминга
  if (isStreamComplete && jsonData.function?.questions?.length) {
    readableText += formatQuestions(jsonData.function.questions);
  }

  return readableText;
};

/**
 * Получает основной текст статуса
 */
const getMainStatusText = (jsonData: ParsedJSONData): string => {
  if (jsonData.current_situation) {
    return `${jsonData.current_situation}\n\n`;
  } else if (jsonData.plan_status) {
    return `Статус: ${jsonData.plan_status}\n\n`;
  } else {
    return `Обрабатываю запрос...\n\n`;
  }
};

/**
 * Форматирует вопросы в нумерованный список
 */
const formatQuestions = (questions: string[]): string => {
  let questionsText = '';
  questions.forEach((question, index) => {
    questionsText += `${index + 1}. ${question}\n`;
  });
  questionsText += `\n`;
  return questionsText;
};

/**
 * Создает секцию со ВСЕМИ деталями (оптимизированная версия)
 */
const buildAllDetailsSection = (jsonData: ParsedJSONData): string => {
  const sections: string[] = [];

  // Основные секции
  sections.push(formatReasoningSteps(jsonData.reasoning_steps));
  sections.push(formatSimpleField('Статус плана', jsonData.plan_status));
  sections.push(formatStepsList('Оставшиеся шаги', jsonData.remaining_steps));
  sections.push(formatBooleanField('Достаточно данных', jsonData.enough_data));
  sections.push(formatBooleanField('Задача выполнена', jsonData.task_completed));
  
  // Данные функции
  if (jsonData.function) {
    sections.push(formatFunctionDetails(jsonData.function));
  }
  
  // Дополнительные поля
  sections.push(formatSimpleField('Reasoning', jsonData.reasoning));
  sections.push(formatSimpleField('Title', jsonData.title));
  sections.push(formatSimpleField('Content', jsonData.content));
  sections.push(formatSimpleField('Confidence', jsonData.confidence));

  return sections.filter(Boolean).join('');
};

/**
 * Форматирует шаги размышления
 */
const formatReasoningSteps = (steps?: string[]): string => {
  if (!steps?.length) return '';
  
  let text = `**Reasoning steps:**\n`;
  steps.forEach((step, index) => {
    text += `${index + 1}. ${step}\n`;
  });
  return text + `\n`;
};

/**
 * Форматирует простое поле
 */
const formatSimpleField = (label: string, value?: string): string => {
  return value ? `**${label}:** ${value}\n\n` : '';
};

/**
 * Форматирует список шагов
 */
const formatStepsList = (label: string, steps?: string[]): string => {
  if (!steps?.length) return '';
  
  let text = `**${label}:**\n`;
  steps.forEach((step, index) => {
    text += `${index + 1}. ${step}\n`;
  });
  return text + `\n`;
};

/**
 * Форматирует булево поле
 */
const formatBooleanField = (label: string, value?: boolean): string => {
  if (value === undefined) return '';
  return `**${label}:** ${value ? 'Да' : 'Нет'}\n\n`;
};

/**
 * Форматирует детали функции
 */
const formatFunctionDetails = (func: any): string => {
  const details: string[] = [];
  
  details.push(formatSimpleField('Обоснование функции', func.reasoning));
  details.push(formatSimpleField('Поисковый запрос', func.query));
  details.push(formatSimpleField('Заголовок отчета', func.title));
  details.push(formatSimpleField('Содержимое', func.content));
  details.push(formatStepsList('Следующие шаги', func.next_steps));
  details.push(formatSimpleField('Используемый инструмент', func.tool_name_discriminator));
  
  if (func.unclear_terms?.length) {
    details.push(`**Неясные термины:** ${func.unclear_terms.join(', ')}\n\n`);
  }
  
  details.push(formatStepsList('Предположения', func.assumptions));
  
  return details.filter(Boolean).join('');
};

/**
 * Парсит содержимое сообщения и извлекает основной текст и спойлер
 */
export const parseMessageContent = (content: string) => {
  // Ищем спойлер и его содержимое (работает с HTML)
  const spoilerMatch = content.match(/~~\{([^}]+)\}~~(.*?)(?=<br><br>(?:\d+\.)|$)/s);
  
  // Извлекаем текст ДО спойлера и ПОСЛЕ спойлера
  const beforeSpoiler = content.split(/~~\{[^}]+\}~~/)[0].trim();
  
  // Ищем текст после спойлера (начинается с номерованного списка)
  const afterSpoilerMatch = content.match(/~~\{[^}]+\}~~.*?<br><br>(\d+\..*)/s);
  const afterSpoiler = afterSpoilerMatch ? afterSpoilerMatch[1].trim() : '';
  
  // Основной текст = текст до спойлера + текст после спойлера
  const mainText = (beforeSpoiler + (afterSpoiler ? '<br><br>' + afterSpoiler : '')).trim() || 'Ответ готов';
  const spoilerText = spoilerMatch ? spoilerMatch[2].trim() : undefined;
  const spoilerTitle = spoilerMatch ? spoilerMatch[1] : undefined;

  return { mainText, spoilerText, spoilerTitle };
};