const { conn } = require('./conn')
const Pool = require('pg').Pool
const pool = new Pool(conn)

const listUsers = (req, res, next) => {
    pool.query('SELECT * FROM users ORDER BY user_id ASC', (error, results) => {
        if (error) {
            throw error
        }
        res.status(200).json(results.rows)
    })
}

const getUserById = (req, res, next) => {
    const username = req.params.id

    pool.query('SELECT * FROM users WHERE username = $1', [username], (error, results) => {
        if (error) {
            throw error
        }
        res.status(200).json(results.rows)
    })
}

const createUser = (req, res, next) => {
    const { name, email } = req.body

    pool.query('INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *', [name, email], (error, results) => {
        if (error) {
            throw error
        }
        res.status(201).send(`User added with ID: ${results.rows[0].id}`)
    })
}

const updateUser = (req, res, next) => {
    const id = parseInt(req.params.id)
    const { name, email } = req.body

    pool.query(
        'UPDATE users SET name = $1, email = $2 WHERE id = $3',
        [name, email, id],
        (error, results) => {
            if (error) {
                throw error
            }
            res.status(200).send(`User modified with ID: ${id}`)
        }
    )
}

const deleteUser = (req, res, next) => {
    const id = parseInt(req.params.id)

    pool.query('DELETE FROM users WHERE id = $1', [id], (error, results) => {
        if (error) {
            throw error
        }
        res.status(200).send(`User deleted with ID: ${id}`)
    })
}

module.exports = {
    listUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
}
