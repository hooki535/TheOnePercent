"""Every screen that used to be a static .html file. Templates are
byte-identical to the originals except for path rewrites — see
templates/index.html and templates/pages/*.html."""

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


@pages.get("/onboarding")
def onboarding():
    return render_template("pages/onboarding.html")


@pages.get("/settings")
def settings():
    return render_template("pages/settings.html")


@pages.get("/sign-up")
def sign_up():
    return render_template("pages/sign-up.html")
