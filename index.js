const express = require('express');
const app = express();
const courses = require('./courses.json');
const port = 5000;

app.get('/', (req, res) => {
    res.send('Course !! O my Allah Hello world ')
});

app.get('/courses', (req, res) =>{
    res.send(courses)
});

app.get('/courses/:id', (req, res) =>{
    const id = parseInt(req.params.id);
    console.log(id);
    const course = courses.find(cs => cs.id === id) || {};
    res.send(course)
})

app.listen(port, () =>{
    console.log(`Server running on port: ${port}`)
});