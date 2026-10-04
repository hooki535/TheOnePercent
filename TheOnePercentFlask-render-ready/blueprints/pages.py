"""Every screen that used to be a static .html file. Templates are
generated from the root static pages with path rewrites only (assets via
url_for('static'), page links via url_for('pages.*')) plus one inline flag,
window.OP_FLASK, that tells the shared scripts to use these flat routes."""

from flask import Blueprint, render_template

pages = Blueprint("pages", __name__)


@pages.get("/")
def index():
    return render_template("index.html")


@pages.get("/dashboard")
def dashboard():
    return render_template("pages/dashboard.html")


@pages.get("/charts")
def charts():
    return render_template("pages/charts.html")


@pages.get("/journal")
def journal():
    return render_template("pages/journal.html")


@pages.get("/calculators")
def calculators():
    return render_template("pages/calculators.html")


@pages.get("/learn")
def learn():
    return render_template("pages/learn.html")


@pages.get("/login")
def login():
    return render_template("pages/login.html")


@pages.get("/reset-password")
def reset_password():
    return render_template("pages/reset-password.html")


@pages.get("/onboarding")
def onboarding():
    return render_template("pages/onboarding.html")


@pages.get("/settings")
def settings():
    return render_template("pages/settings.html")


@pages.get("/sign-up")
def sign_up():
    return render_template("pages/sign-up.html")
