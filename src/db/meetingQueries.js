const { conn } = require('./conn')

const Pool = require('pg').Pool
const pool = new Pool(conn)

const listMeetings = (req, res, next) => {
    pool.query('SELECT * FROM meetings ORDER BY created_on ASC', (error, results) => {
        if (error) {
            throw error
        }
        res.status(200).json(results.rows)
    })
}

const getMeetingByKey = (req, res, next) => {
    const meetKey = req.params.id

    pool.query('SELECT * FROM meetings WHERE meet_key = $1', [meetKey], (error, results) => {
        if (error) {
            throw error
        }
        res.status(200).json(results.rows)
    })
}

const createMeeting = (req, res, next) => {
    const { title, meetKey } = req.body

    pool.query('INSERT INTO meetings (title, meet_key) VALUES ($1, $2) RETURNING *', [title, meetKey], (error, results) => {
        if (error) {
            throw error
        }
        res.status(201).send(`Meet added with ID: ${results.rows[0].id}`)
    })
}

const updateMeeting = (req, res, next) => {
    const id = parseInt(req.params.id)
    const { title, meetKey } = req.body

    pool.query(
        'UPDATE meetings SET title = $1, meet_key = $2 WHERE id = $3',
        [title, meetKey, id],
        (error, results) => {
            if (error) {
                throw error
            }
            res.status(200).send(`Meet modified with ID: ${id}`)
        }
    )
}

const deleteMeeting = (req, res, next) => {
    const id = parseInt(req.params.id)

    pool.query('DELETE FROM meetings WHERE id = $1', [id], (error, results) => {
        if (error) {
            throw error
        }
        res.status(200).send(`Meet deleted with ID: ${id}`)
    })
}

module.exports = {
    listMeetings,
    getMeetingByKey,
    createMeeting,
    updateMeeting,
    deleteMeeting
}
