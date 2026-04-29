function getMultipleChoiceSlotCount(item = {}) {
  const explicitCount = Number(item.pointsAvailable ?? item.selectionCount);

  if (Number.isFinite(explicitCount) && explicitCount > 0) {
    return explicitCount;
  }

  if (Array.isArray(item.correctAnswers) && item.correctAnswers.length > 0) {
    return item.correctAnswers.length;
  }

  return 1;
}

export function countQuestionUnitsFromQuestion(question = {}, fallbackType = "") {
  const questionType = question.type || fallbackType;

  if (questionType === "MULTIPLE_CHOICE") {
    return getMultipleChoiceSlotCount(question);
  }

  return 1;
}

export function countQuestionUnitsFromDraftGroups(questionGroups = []) {
  if (!Array.isArray(questionGroups)) {
    return 0;
  }

  return questionGroups.reduce((total, group) => {
    const items = Array.isArray(group?.items) ? group.items : [];

    return (
      total +
      items.reduce(
        (groupTotal, item) =>
          groupTotal + countQuestionUnitsFromQuestion(item, group?.type),
        0
      )
    );
  }, 0);
}

export function countQuestionUnitsFromSections(sections = []) {
  if (!Array.isArray(sections)) {
    return 0;
  }

  return sections.reduce((total, section) => {
    const groups = Array.isArray(section?.questions) ? section.questions : [];

    return (
      total +
      groups.reduce((groupTotal, group) => {
        const questions = Array.isArray(group?.questions) ? group.questions : [];

        return (
          groupTotal +
          questions.reduce(
            (questionTotal, question) =>
              questionTotal + countQuestionUnitsFromQuestion(question, group?.type),
            0
          )
        );
      }, 0)
    );
  }, 0);
}

export function countQuestionUnitsFromAnswerKey(answerKey = {}) {
  return Object.values(answerKey || {}).reduce(
    (total, answer) => total + countQuestionUnitsFromQuestion(answer),
    0
  );
}
