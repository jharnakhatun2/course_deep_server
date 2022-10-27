const express = require('express');
const app = express();
const cors = require('cors');
const courses = require('./courses.json');
const category = require('./category.json');
const blog = require('./blog.json');
const port = 5000;

app.use(cors());
app.use(express.static('public'))

app.get('/', (req, res) => {
    res.send('welcome to server side')
});

app.get('/courses', (req, res) =>{
    res.send(courses)
});

app.get('/courses/:id', (req, res) =>{
    const id = parseInt(req.params.id);
    console.log(id);
    const course = courses.find(cs => cs.id === id) || {};
    res.send(course)
});

app.get('/category', (req, res) =>{
    res.send(category)
});

app.get('/category/:id', (req, res) =>{
    const id = parseInt(req.params.id);
    console.log(id);
    const categories = category.find(cr => cr.id === id) || {};
    res.send(categories)
});

app.get('/blog', (req, res) =>{
    res.send(blog)
});

app.get('/blog/:id', (req, res) =>{
    const id = parseInt(req.params.id);
    console.log(id);
    const blogs = blog.find(blg => blg.id === id) || {};
    res.send(blogs)
});

app.listen(port, () =>{
    console.log(`Server running on port: ${port}`)
});