const { ObjectId } = require('mongodb');
const { getDb } = require('../db');


async function createQuestionnaire(questionnaireData) {
    const db = getDb();
    const result = await db.collection('questionnaires').insertOne(questionnaireData);
    return result.insertedId;
}

async function getQuestionnairesByUserId(userId) {
    const db = getDb();
    const questionnaires = await db.collection('questionnaires').find({ userId }).toArray();
    return questionnaires;
}

async function getQuestionnaireInfo(userId, questionnaireId) {
    const db = getDb();
    try {
        const questionnaire = await db.collection('questionnaires').findOne({ _id: ObjectId(questionnaireId), userId: userId });
        return questionnaire;
    } catch (error) {
        console.error(error);
        throw new Error('Error al obtener el cuestionario');
    }
}

async function getQuestionnaireInfoWOUser(questionnaireId) {
    const db = getDb();
    try {
        const questionnaire = await db.collection('questionnaires').findOne({ _id: ObjectId(questionnaireId)});
        return questionnaire;
    } catch (error) {
        console.error(error);
        throw new Error('Error al obtener el cuestionario');
    }
}

async function deleteQuestionnaire(questionnaireId) {
    const db = getDb();
    const result = await db.collection('questionnaires').deleteOne({ _id: ObjectId(questionnaireId) });

    if (result.deletedCount === 1) {
        return true;
    } else {
        return false;
    }
}

async function updateQuestionnaire(questionnaireId, updates) {
    const db = getDb();

    const result = await db.collection('questionnaires').updateOne(
        { _id: ObjectId(questionnaireId) },
        { $set: updates }
    );

    if (result.modifiedCount === 1) {
        return true;
    } else {
        return false;
    }
}



module.exports = {
    createQuestionnaire,
    getQuestionnairesByUserId,
    deleteQuestionnaire,
    updateQuestionnaire,
    getQuestionnaireInfo,
    getQuestionnaireInfoWOUser
};
