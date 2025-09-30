import * as React from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import "./App.css";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Products from "./pages/Products";
import Users from "./pages/Users";
import { Layout } from "./components/Layout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/products" element={<Products />} />
        <Route path="/users" element={<Users />} />
        <Route
          path="*"
          element={
            <Layout>
              <div>
                Page not found. Go to <Link to="/">Dashboard</Link>
              </div>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
